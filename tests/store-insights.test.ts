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
  reportPeriodRange,
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
  it("distinguishes gross merchandise, net sales, completed AOV and recorded cash without shipping or refund double counts", () => {
    const report = buildStoreReport(
      [
        reportOrder({
          subtotal: 100000,
          discount_amount: 10000,
          shipping_fee: 20000,
          total: 110000,
          status: "completed",
          payment_method: "cod",
          payment_status: "paid",
          paid_at: "2026-10-02T00:00:00Z",
        }),
        reportOrder({
          id: "pending",
          subtotal: 200000,
          discount_amount: 0,
          shipping_fee: 30000,
          total: 230000,
          payment_method: "bank_transfer",
        }),
        reportOrder({
          id: "cancelled",
          subtotal: 80000,
          discount_amount: 8000,
          total: 92000,
          status: "cancelled",
        }),
        reportOrder({
          id: "returned",
          subtotal: 50000,
          discount_amount: 5000,
          shipping_fee: 20000,
          total: 65000,
          status: "returned",
          payment_status: "refunded",
          paid_at: "2026-10-01T00:00:00Z",
          refunded_at: "2026-10-03T00:00:00Z",
        }),
      ],
      range,
    );
    expect(report).toMatchObject({
      gross_sales: 430000,
      discounts: 10000,
      cancelled_sales: 80000,
      returned_sales: 50000,
      refunded_sales: 0,
      net_sales: 290000,
      order_value: 340000,
      completed_average_order_value: 90000,
      awaiting_payment_value: 230000,
      collected: 175000,
      refunded: 65000,
      net_collected: 110000,
    });
    expect(
      report.payment_breakdown.find((row) => row.method === "cod"),
    ).toMatchObject({ collected: 110000, awaiting: 0 });
    expect(
      report.payment_breakdown.find((row) => row.method === "bank_transfer"),
    ).toMatchObject({ awaiting: 230000 });
    expect(report.products[0].quantity).toBe(4);
    expect(report.daily.reduce((sum, row) => sum + row.net_sales, 0)).toBe(
      report.net_sales,
    );
  });
  it("uses Vietnam calendar presets including yesterday, Monday week start and year boundaries", () => {
    const now = new Date("2026-10-04T18:00:00Z"); // Monday in Vietnam.
    expect(reportPeriodRange(now, "today")).toEqual({
      from: "2026-10-05",
      to: "2026-10-05",
    });
    expect(reportPeriodRange(now, "yesterday")).toEqual({
      from: "2026-10-04",
      to: "2026-10-04",
    });
    expect(reportPeriodRange(now, "week")).toEqual({
      from: "2026-10-05",
      to: "2026-10-05",
    });
    expect(reportPeriodRange(now, "month")).toEqual({
      from: "2026-10-01",
      to: "2026-10-05",
    });
    expect(
      reportPeriodRange(new Date("2026-01-01T01:00:00Z"), "yesterday"),
    ).toEqual({ from: "2025-12-31", to: "2025-12-31" });
    expect(reportPeriodRange(now, "year").from).toBe("2026-01-01");
    expect(reportCsv(buildStoreReport([], range))).toContain(
      '"Doanh thu sản phẩm thuần","0"',
    );
  });

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

describe("immutable sale costs", () => {
  const range = { from: "2026-10-01", to: "2026-10-05" };
  const lines = [
    {
      id: "a",
      product_id: "a",
      name: "Eligible",
      price: 50000,
      quantity: 2,
      unit_cost: 20000,
      line_discount: 10000,
    },
    {
      id: "b",
      product_id: "b",
      name: "Other",
      price: 20000,
      quantity: 1,
      unit_cost: 5000,
      line_discount: 0,
    },
  ];
  it("uses exact line discounts and snapshots, with paid merchandise AOV", () => {
    const report = buildStoreReport(
      [
        reportOrder({
          items: lines,
          subtotal: 120000,
          discount_amount: 10000,
          shipping_fee: 20000,
          total: 130000,
          status: "completed",
          payment_status: "paid",
        }),
      ],
      range,
    );
    expect(report).toMatchObject({
      net_sales: 110000,
      cogs: 45000,
      gross_profit: 65000,
      shipping_charged: 20000,
      completed_average_order_value: 110000,
      successful_order_count: 1,
    });
    expect(report.products.find((row) => row.id === "a")).toMatchObject({
      net_value: 90000,
      gross_profit: 50000,
    });
    expect(report.products.find((row) => row.id === "b")).toMatchObject({
      net_value: 20000,
      gross_profit: 15000,
    });
    expect(report.daily[0].gross_profit).toBe(65000);
  });
  it("keeps damaged returns as cost and reverses only explicitly restocked returns", () => {
    const order = reportOrder({
      items: lines,
      subtotal: 120000,
      discount_amount: 10000,
      status: "returned",
      payment_status: "refunded",
      return_restocked: false,
    });
    const damaged = buildStoreReport([order], range);
    expect(damaged).toMatchObject({
      net_sales: 0,
      cogs: 45000,
      gross_profit: -45000,
      damaged_return_cost: 45000,
    });
    expect(
      buildStoreReport([{ ...order, return_restocked: true }], range),
    ).toMatchObject({
      net_sales: 0,
      cogs: 0,
      gross_profit: 0,
      damaged_return_cost: 0,
    });
    expect(
      buildStoreReport([{ ...order, status: "cancelled" }], range).cogs,
    ).toBe(0);
  });
  it("never invents missing legacy costs or product discount allocation", () => {
    const report = buildStoreReport(
      [reportOrder({ discount_amount: 10000 })],
      range,
    );
    expect(report).toMatchObject({
      cogs: null,
      gross_profit: null,
      missing_cost_order_count: 1,
    });
    expect(report.products[0]).toMatchObject({
      net_value: null,
      gross_profit: null,
    });
    expect(reportCsv(report)).toContain("Chưa đủ giá vốn");
  });
  it("deducts damaged-return costs once from product profit without inflating sold quantities or revenue", () => {
    const sale = reportOrder({
      items: lines,
      subtotal: 120000,
      discount_amount: 10000,
      status: "completed",
      payment_status: "paid",
    });
    const damaged = {
      ...sale,
      id: "damaged",
      status: "returned" as const,
      payment_status: "refunded" as const,
      return_restocked: false,
    };
    const report = buildStoreReport([sale, damaged], range);
    expect(report).toMatchObject({
      net_sales: 110000,
      cogs: 90000,
      gross_profit: 20000,
    });
    expect(report.products.find((product) => product.id === "a")).toMatchObject(
      {
        quantity: 2,
        line_value: 100000,
        net_value: 90000,
        cost: 80000,
        gross_profit: 10000,
      },
    );
    expect(report.products.find((product) => product.id === "b")).toMatchObject(
      { quantity: 1, net_value: 20000, cost: 10000, gross_profit: 10000 },
    );
    expect(
      report.products.reduce(
        (sum, product) => sum + (product.gross_profit ?? 0),
        0,
      ),
    ).toBe(report.gross_profit);
  });
  it("includes loss-only products and excludes saleable restocked returns", () => {
    const returned = reportOrder({
      items: lines,
      subtotal: 120000,
      discount_amount: 10000,
      status: "returned",
      payment_status: "refunded",
      return_restocked: false,
    });
    const damaged = buildStoreReport([returned], range);
    expect(
      damaged.products.find((product) => product.id === "a"),
    ).toMatchObject({
      quantity: 0,
      line_value: 0,
      net_value: 0,
      cost: 40000,
      cost_complete: true,
      gross_profit: -40000,
    });
    expect(
      damaged.products.find((product) => product.id === "b"),
    ).toMatchObject({ quantity: 0, net_value: 0, gross_profit: -5000 });
    expect(
      buildStoreReport([{ ...returned, return_restocked: true }], range)
        .products,
    ).toEqual([]);
    const sale = {
      ...returned,
      id: "sale",
      status: "completed" as const,
      payment_status: "paid" as const,
    };
    expect(
      buildStoreReport(
        [sale, { ...returned, return_restocked: true }],
        range,
      ).products.find((product) => product.id === "a"),
    ).toMatchObject({ quantity: 2, cost: 40000, gross_profit: 50000 });
  });
  it("marks only affected product profits unknown when a damaged return has missing costs", () => {
    const sale = reportOrder({
      items: lines,
      subtotal: 120000,
      discount_amount: 10000,
    });
    const damaged = {
      ...sale,
      id: "damaged",
      status: "returned" as const,
      payment_status: "refunded" as const,
      return_restocked: false,
      items: [{ ...lines[0], unit_cost: null }, lines[1]],
    };
    const report = buildStoreReport([sale, damaged], range);
    expect(report).toMatchObject({
      cogs: null,
      gross_profit: null,
      missing_cost_order_count: 1,
    });
    expect(report.products.find((product) => product.id === "a")).toMatchObject(
      {
        quantity: 2,
        net_value: 90000,
        cost_complete: false,
        gross_profit: null,
      },
    );
    expect(report.products.find((product) => product.id === "b")).toMatchObject(
      { quantity: 1, cost_complete: true, cost: 10000, gross_profit: 10000 },
    );
    expect(
      buildStoreReport([damaged], range).products.find(
        (product) => product.id === "a",
      ),
    ).toMatchObject({
      quantity: 0,
      net_value: 0,
      cost_complete: false,
      gross_profit: null,
    });
  });
});
