import { describe, expect, it } from "vitest";
import {
  consolidateCustomers,
  type CustomerOrder,
  type CustomerProfile,
} from "@/lib/customer-insights";
import {
  buildStoreReport,
  csvCell,
  reportCsv,
  reportDateRange,
  storeDate,
  type ReportOrder,
} from "@/lib/store-reports";

const profile: CustomerProfile = {
  id: "account-1",
  full_name: "Tên hồ sơ",
  email: "buyer@example.com",
  phone: "0901234567",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};
function customerOrder(overrides: Partial<CustomerOrder> = {}): CustomerOrder {
  return {
    id: "order-1",
    reference: "MB-1",
    user_id: null,
    customer_name: "Tên giao hàng",
    email: " BUYER@example.com ",
    phone: "0909876543",
    total: 100000,
    status: "pending",
    created_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}
function reportOrder(overrides: Partial<ReportOrder> = {}): ReportOrder {
  return {
    id: "order-1",
    total: 120000,
    status: "pending",
    payment_status: "awaiting_payment",
    paid_at: null,
    refunded_at: null,
    created_at: "2026-10-01T00:00:00Z",
    items: [
      {
        id: "item-1",
        product_id: "product-1",
        name: "Mộc",
        price: 50000,
        quantity: 2,
      },
    ],
    ...overrides,
  };
}

describe("customer identity and history", () => {
  it("joins account profiles, normalized guest purchases and contacts without overwriting current profile details", () => {
    const customers = consolidateCustomers(
      [profile],
      [
        customerOrder(),
        customerOrder({
          id: "order-2",
          user_id: profile.id,
          total: 90000,
          status: "cancelled",
          created_at: "2026-10-03T00:00:00Z",
        }),
      ],
      [
        {
          id: "inquiry-1",
          name: "Tên liên hệ",
          email: "buyer@example.com",
          phone: "",
          created_at: "2026-10-04T00:00:00Z",
        },
      ],
    );
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      id: "account:account-1",
      user_id: profile.id,
      name: "Tên hồ sơ",
      phone: profile.phone,
      order_count: 2,
      active_order_count: 1,
      order_value: 100000,
      inquiry_count: 1,
      last_order_at: "2026-10-03T00:00:00Z",
      last_activity_at: "2026-10-04T00:00:00Z",
    });
    expect(customers[0].orders.map((order) => order.id)).toEqual([
      "order-2",
      "order-1",
    ]);
  });
  it("never merges different authenticated accounts sharing a historical email", () => {
    const customers = consolidateCustomers(
      [profile, { ...profile, id: "account-2" }],
      [
        customerOrder(),
        customerOrder({ id: "order-2", user_id: "account-1" }),
        customerOrder({ id: "order-3", user_id: "account-2" }),
      ],
      [],
    );
    expect(customers).toHaveLength(3);
    expect(
      customers
        .find((customer) => customer.id === "guest:buyer@example.com")
        ?.orders.map((order) => order.id),
    ).toEqual(["order-1"]);
    expect(
      customers
        .filter((customer) => customer.user_id)
        .map((customer) => customer.order_count),
    ).toEqual([1, 1]);
  });
  it("keeps stable account identities across email changes and separate guests without emails", () => {
    const orders = [
      customerOrder({ user_id: "account-1" }),
      customerOrder({
        id: "order-2",
        user_id: "account-1",
        email: "new@example.com",
      }),
      customerOrder({ id: "anonymous-1", email: "" }),
      customerOrder({ id: "anonymous-2", email: "" }),
    ];
    const customers = consolidateCustomers([], orders, []);
    expect(customers).toHaveLength(3);
    expect(
      customers.find((customer) => customer.id === "account:account-1")
        ?.order_count,
    ).toBe(2);
    expect(
      customers
        .filter((customer) => !customer.user_id)
        .map((customer) => customer.id)
        .sort(),
    ).toEqual(["order:anonymous-1", "order:anonymous-2"]);
  });
});

describe("transactional store reports", () => {
  const range = { from: "2026-10-01", to: "2026-10-05" };
  it("excludes cancellations from order value and popular items while counting their status", () => {
    const report = buildStoreReport(
      [
        reportOrder(),
        reportOrder({ id: "cancelled", total: 999000, status: "cancelled" }),
        reportOrder({ id: "completed", total: 80000, status: "completed" }),
      ],
      range,
    );
    expect(report).toMatchObject({
      order_count: 3,
      active_order_count: 2,
      cancelled_order_count: 1,
      completed_order_count: 1,
      order_value: 200000,
      average_order_value: 100000,
      awaiting_payment_value: 200000,
    });
    expect(report.products[0]).toMatchObject({
      quantity: 4,
      line_value: 200000,
    });
    expect(report.daily[0]).toMatchObject({
      order_count: 3,
      order_value: 200000,
    });
  });
  it("uses payment/refund dates even for earlier orders and preserves collected money on cancelled paid orders", () => {
    const report = buildStoreReport(
      [
        reportOrder({
          id: "old-refunded",
          created_at: "2026-09-01T00:00:00Z",
          payment_status: "refunded",
          paid_at: "2026-09-03T00:00:00Z",
          refunded_at: "2026-10-03T00:00:00Z",
          total: 150000,
        }),
        reportOrder({
          id: "cancelled-paid",
          status: "cancelled",
          payment_status: "paid",
          paid_at: "2026-10-02T00:00:00Z",
          total: 100000,
        }),
        reportOrder({
          id: "both",
          payment_status: "refunded",
          paid_at: "2026-10-01T00:00:00Z",
          refunded_at: "2026-10-04T00:00:00Z",
          total: 30000,
        }),
      ],
      range,
    );
    expect(report).toMatchObject({
      order_count: 2,
      order_value: 30000,
      collected: 130000,
      refunded: 180000,
      net_collected: -50000,
    });
    expect(report.daily.find((day) => day.date === "2026-10-03")).toMatchObject(
      { order_count: 0, refunded: 150000 },
    );
  });
  it("applies inclusive calendar-day bounds in Vietnam at UTC day boundaries", () => {
    expect(storeDate("2026-09-30T17:00:00Z")).toBe("2026-10-01");
    const report = buildStoreReport(
      [
        reportOrder({ created_at: "2026-09-30T16:59:59Z" }),
        reportOrder({ id: "start", created_at: "2026-09-30T17:00:00Z" }),
        reportOrder({ id: "end", created_at: "2026-10-05T16:59:59Z" }),
        reportOrder({ id: "outside", created_at: "2026-10-05T17:00:00Z" }),
      ],
      range,
    );
    expect(report.order_count).toBe(2);
    expect(reportDateRange(new Date("2026-10-05T12:00:00Z"), 7)).toEqual({
      from: "2026-09-29",
      to: "2026-10-05",
    });
  });
  it("handles no orders without nonfinite averages and does not invent conversion metrics", () => {
    const report = buildStoreReport([], range);
    expect(report.average_order_value).toBe(0);
    expect(report.collected).toBe(0);
    expect(report).not.toHaveProperty("conversion_rate");
    expect(report).not.toHaveProperty("visitors");
  });
  it("protects exported product text from CSV formulas and escapes quotes/newlines", () => {
    const product = {
      id: "item",
      product_id: "product",
      name: '=HYPERLINK("example")\nMộc',
      price: 100,
      quantity: 1,
    };
    const csv = reportCsv(
      buildStoreReport([reportOrder({ items: [product] })], range),
    );
    expect(csv).toContain('"\'=HYPERLINK(""example"")\nMộc"');
    expect(csv.startsWith("\ufeff")).toBe(true);
    expect(csvCell(" +SUM(A1:A2)")).toBe('"\' +SUM(A1:A2)"');
    expect(csvCell(-50)).toBe('"-50"');
  });
});
