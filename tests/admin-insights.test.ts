import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/lib/http";
import { getAdminCustomers, getAdminReportOrders } from "@/lib/admin-insights";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));

beforeEach(() => {
  vi.resetAllMocks();
  const chain = {
    select: mocks.select,
    order: mocks.order,
    range: mocks.range,
  };
  mocks.from.mockReturnValue(chain);
  mocks.select.mockReturnValue(chain);
  mocks.order.mockReturnValue(chain);
  mocks.range.mockResolvedValue({ data: [], error: null });
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.requireAdmin.mockResolvedValue({
    supabase: { from: mocks.from, rpc: mocks.rpc },
  });
});

describe("private customer and report data reads", () => {
  it.each([401, 403, 503])(
    "authorizes before any database query when access fails with %i",
    async (status) => {
      mocks.requireAdmin.mockRejectedValue(
        new HttpError(status, "Access denied"),
      );
      await expect(getAdminCustomers()).rejects.toMatchObject({ status });
      await expect(getAdminReportOrders()).rejects.toMatchObject({ status });
      expect(mocks.from).not.toHaveBeenCalled();
    },
  );
  it("queries only the profile/contact/order fields needed for customer history", async () => {
    expect(await getAdminCustomers()).toEqual([]);
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.from.mock.calls.flat()).toEqual([
      "profiles",
      "orders",
      "inquiries",
    ]);
    expect(mocks.select).toHaveBeenCalledWith(
      "id,full_name,email,phone,created_at,updated_at",
    );
    const columns = mocks.select.mock.calls.map(([fields]) => fields).join(",");
    expect(columns).not.toMatch(/address|message|bank|token|password/);
  });
  it("loads later pages instead of silently limiting financial totals and returns no customer contacts", async () => {
    const page = Array.from({ length: 500 }, (_, id) => ({
      id: `order-${id}`,
    }));
    mocks.range
      .mockResolvedValueOnce({ data: page, error: null })
      .mockResolvedValueOnce({ data: [{ id: "order-500" }], error: null });
    const rows = await getAdminReportOrders();
    expect(rows).toHaveLength(501);
    expect(mocks.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
    ]);
    expect(mocks.order).toHaveBeenCalledWith("id", { ascending: true });
    const columns = mocks.select.mock.calls[0][0];
    expect(columns).toContain("paid_at,refunded_at");
    expect(columns).not.toMatch(
      /customer_name|email|phone|address|payment_bank/,
    );
  });
  it("does not present a partial report if a later database page fails", async () => {
    mocks.range
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, id) => ({ id })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "INVALID_REQUEST", message: "INVALID_REQUEST" },
      });
    await expect(getAdminReportOrders()).rejects.toMatchObject({ status: 400 });
  });
  it("merges administrator-only cost snapshots without requesting costs in customer-visible selects", async () => {
    mocks.range.mockResolvedValue({
      data: [{ id: "order", items: [{ id: "known" }, { id: "legacy" }] }],
      error: null,
    });
    mocks.rpc.mockResolvedValue({
      data: [{ id: "known", unit_cost: 45000 }],
      error: null,
    });
    const rows = await getAdminReportOrders();
    expect(rows[0].items).toEqual([
      { id: "known", unit_cost: 45000 },
      { id: "legacy", unit_cost: null },
    ]);
    expect(mocks.rpc).toHaveBeenCalledWith("get_admin_order_item_costs", {
      p_offset: 0,
      p_limit: 500,
    });
    expect(mocks.select.mock.calls.flat().join(",")).not.toContain("unit_cost");
  });
});
