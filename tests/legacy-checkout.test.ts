import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalOrderPayload, orderSchema } from "@/lib/validation";
import { digest } from "@/lib/supabase/receipts";
import { demoProducts } from "@/lib/demo-data";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  existing: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => null }));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceSupabase: () => ({ rpc: mocks.rpc, from: mocks.from }),
}));
import { POST } from "@/app/api/orders/route";

const input = {
  items: [{ product_id: demoProducts[0].id, quantity: 1 }],
  customer: {
    name: "Legacy test",
    email: "test@example.invalid",
    phone: "0900000000",
    address: "No delivery",
    city: "Test",
    note: "",
  },
  idempotency_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
const send = (body: unknown) =>
  POST(
    new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  vi.stubEnv("ORDER_TOKEN_SECRET", "s".repeat(32));
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: mocks.existing,
  };
  mocks.from.mockReturnValue(query);
  mocks.existing.mockResolvedValue({ data: null, error: null });
  mocks.rpc.mockResolvedValue({
    data: { id: input.idempotency_key, reference: "MB-1" },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("HTTP checkout compatibility across manual-payment deployment", () => {
  it("reuses the pre-payment hash only for an existing legacy order and an omitted method", async () => {
    mocks.existing.mockResolvedValue({
      data: { payment_method: "unconfigured" },
      error: null,
    });
    expect((await send(input)).status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_order",
      expect.objectContaining({
        p_payment_method: "cod",
        p_payload_hash: digest(
          canonicalOrderPayload(orderSchema.parse(input), null, false),
        ),
      }),
    );
  });
  it("gives new requests the modern COD hash even when old clients omit the method", async () => {
    expect((await send(input)).status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_order",
      expect.objectContaining({
        p_payment_method: "cod",
        p_payload_hash: digest(
          canonicalOrderPayload(orderSchema.parse(input), null),
        ),
      }),
    );
  });
  it("does not downgrade an explicitly selected payment method to legacy hashing", async () => {
    mocks.existing.mockResolvedValue({
      data: { payment_method: "unconfigured" },
      error: null,
    });
    const transfer = { ...input, payment_method: "bank_transfer" };
    await send(transfer);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_order",
      expect.objectContaining({
        p_payment_method: "bank_transfer",
        p_payload_hash: digest(
          canonicalOrderPayload(orderSchema.parse(transfer), null),
        ),
      }),
    );
  });
  it("still rejects changed contents when retrying an existing legacy checkout", async () => {
    mocks.existing.mockResolvedValue({
      data: { payment_method: "unconfigured" },
      error: null,
    });
    const savedHash = digest(
      canonicalOrderPayload(orderSchema.parse(input), null, false),
    );
    mocks.rpc.mockImplementation(async (_name, params) =>
      params.p_payload_hash === savedHash
        ? {
            data: { id: input.idempotency_key, reference: "MB-1" },
            error: null,
          }
        : {
            data: null,
            error: { message: "IDEMPOTENCY_CONFLICT", code: "P0001" },
          },
    );
    expect((await send(input)).status).toBe(201);
    expect(
      (
        await send({
          ...input,
          customer: { ...input.customer, note: "Changed" },
        })
      ).status,
    ).toBe(409);
  });
});
