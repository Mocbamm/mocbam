import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/lib/http";
import { GET, POST } from "@/app/api/admin/orders/[id]/payment/route";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  selectOrder: vi.fn(),
  eqOrder: vi.fn(),
  maybeSingle: vi.fn(),
  selectEvents: vi.fn(),
  eqEvents: vi.fn(),
  orderEvents: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const context = (orderId = id) => ({
  params: Promise.resolve({ id: orderId }),
});
const url = `http://localhost:3000/api/admin/orders/${id}/payment`;
const request = (body: unknown, origin = "http://localhost:3000") =>
  new Request(url, {
    method: "POST",
    headers: {
      origin,
      host: "localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
const payment = {
  id,
  status: "pending",
  payment_status: "paid",
  paid_at: "2026-10-03T02:00:00Z",
  refunded_at: null,
};
const audit = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  event: "paid",
  amount: 99000,
  note: "Synthetic receipt verification",
  created_at: "2026-10-03T02:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  const orders = {
    select: mocks.selectOrder,
    eq: mocks.eqOrder,
    maybeSingle: mocks.maybeSingle,
  };
  const events = {
    select: mocks.selectEvents,
    eq: mocks.eqEvents,
    order: mocks.orderEvents,
  };
  mocks.selectOrder.mockReturnValue(orders);
  mocks.eqOrder.mockReturnValue(orders);
  mocks.maybeSingle.mockResolvedValue({ data: { id }, error: null });
  mocks.selectEvents.mockReturnValue(events);
  mocks.eqEvents.mockReturnValue(events);
  mocks.orderEvents.mockResolvedValue({ data: [audit], error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === "orders") return orders;
    if (table === "order_payment_events") return events;
    throw new Error("Unexpected table");
  });
  mocks.rpc.mockResolvedValue({ data: payment, error: null });
  mocks.requireAdmin.mockResolvedValue({
    supabase: { from: mocks.from, rpc: mocks.rpc },
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("protected manual payment API", () => {
  it.each([401, 403, 503])(
    "rejects both writes and private audit reads when requireAdmin returns %i",
    async (status) => {
      mocks.requireAdmin.mockRejectedValue(
        new HttpError(status, "Access denied"),
      );
      const responses = [
        await POST(
          request({ action: "paid", note: "Synthetic cash receipt" }),
          context(),
        ),
        await GET(new Request(url), context()),
      ];
      for (const response of responses) {
        expect(response.status).toBe(status);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toEqual({ error: "Access denied" });
      }
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.from).not.toHaveBeenCalled();
    },
  );

  it("rejects another origin before authentication or database access", async () => {
    const response = await POST(
      request(
        { action: "paid", note: "Synthetic receipt" },
        "https://attacker.example",
      ),
      context(),
    );
    expect(response.status).toBe(403);
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires Origin even if an admin session would be accepted", async () => {
    const response = await POST(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "paid", note: "Synthetic receipt" }),
      }),
      context(),
    );
    expect(response.status).toBe(403);
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it.each(["paid", "refunded"])(
    "passes only the checked order/action/trimmed note to the %s RPC",
    async (action) => {
      const response = await POST(
        request({ action, note: "  Synthetic transaction reference  " }),
        context(),
      );
      expect(response.status).toBe(200);
      expect(mocks.requireAdmin).toHaveBeenCalledOnce();
      expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
        "record_order_payment",
        {
          p_order_id: id,
          p_action: action,
          p_note: "Synthetic transaction reference",
        },
      );
      expect(await response.json()).toEqual({ data: payment });
      expect(response.headers.get("cache-control")).toBe("no-store");
    },
  );

  it("returns actual refunded state for a replayed paid action", async () => {
    const refunded = {
      ...payment,
      status: "cancelled",
      payment_status: "refunded",
      refunded_at: "2026-10-03T03:00:00Z",
    };
    mocks.rpc.mockResolvedValue({ data: refunded, error: null });
    const response = await POST(
      request({ action: "paid", note: "Synthetic retry" }),
      context(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: refunded });
  });

  it.each([
    { action: "awaiting_payment", note: "Synthetic receipt" },
    { action: "paid" },
    { action: "paid", note: "   " },
    { action: "paid", note: "x".repeat(201) },
    { action: "paid", note: "Synthetic receipt", amount: 1 },
    { action: "refunded", note: "Synthetic receipt", paid_at: "2026-10-03" },
  ])("rejects unsafe payment payload %j before the RPC", async (body) => {
    const response = await POST(request(body), context());
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(await response.json()).toHaveProperty("error");
  });

  it("rejects invalid route UUIDs before any database query", async () => {
    const responses = [
      await POST(
        request({ action: "paid", note: "Synthetic receipt" }),
        context("invalid-id"),
      ),
      await GET(new Request(url), context("invalid-id")),
    ];
    for (const response of responses) expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("caps request bytes before parsing a large body", async () => {
    const response = await POST(
      request({ action: "paid", note: "x".repeat(2100) }),
      context(),
    );
    expect(response.status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["PAYMENT_TRANSITION_CONFLICT", 409],
    ["ORDER_NOT_FOUND", 404],
    ["INVALID_PAYMENT_NOTE", 400],
  ])("maps database %s to a safe %i response", async (message, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message } });
    const response = await POST(
      request({ action: "paid", note: "Synthetic receipt" }),
      context(),
    );
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body).not.toHaveProperty("data");
    expect(body.error).not.toContain(message);
  });

  it("reads only audit display fields for the exact authorized order", async () => {
    const response = await GET(new Request(url), context());
    expect(response.status).toBe(200);
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.selectOrder).toHaveBeenCalledExactlyOnceWith("id");
    expect(mocks.eqOrder).toHaveBeenCalledExactlyOnceWith("id", id);
    expect(mocks.selectEvents).toHaveBeenCalledExactlyOnceWith(
      "id,event,amount,note,created_at",
    );
    expect(mocks.eqEvents).toHaveBeenCalledExactlyOnceWith("order_id", id);
    expect(mocks.orderEvents).toHaveBeenCalledExactlyOnceWith("created_at", {
      ascending: true,
    });
    expect(await response.json()).toEqual({ data: [audit] });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not read audit rows when the order does not exist", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await GET(new Request(url), context());
    expect(response.status).toBe(404);
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("orders");
    expect(mocks.selectEvents).not.toHaveBeenCalled();
  });
});
