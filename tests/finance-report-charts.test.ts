import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FinanceTrendChart,
  PaymentShareChart,
} from "@/components/admin/finance-report-charts";
import {
  buildStoreReport,
  reportCsv,
  reportTrend,
  type ReportOrder,
} from "@/lib/store-reports";

function order(overrides: Partial<ReportOrder> = {}): ReportOrder {
  return {
    id: "order",
    created_at: "2026-10-01T00:00:00Z",
    status: "completed",
    payment_status: "paid",
    payment_method: "cod",
    paid_at: "2026-10-02T00:00:00Z",
    refunded_at: null,
    subtotal: 100000,
    discount_amount: 10000,
    shipping_fee: 20000,
    total: 110000,
    items: [
      {
        id: "line",
        product_id: "product",
        name: "Mộc",
        price: 100000,
        quantity: 1,
        unit_cost: 40000,
        line_discount: 10000,
      },
    ],
    ...overrides,
  };
}

describe("finance trend calendar buckets", () => {
  it("groups Vietnam dates into Monday weeks, retaining partial periods and zero days", () => {
    const range = { from: "2026-10-04", to: "2026-10-06" };
    const report = buildStoreReport(
      [
        order({ created_at: "2026-10-04T16:59:59Z", paid_at: null }),
        order({
          id: "monday",
          created_at: "2026-10-04T17:00:00Z",
          paid_at: "2026-10-06T00:00:00Z",
        }),
      ],
      range,
    );
    const days = reportTrend(report, "day", range);
    expect(days.map((row) => row.date)).toEqual([
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
    ]);
    expect(days[2]).toMatchObject({
      order_count: 0,
      net_sales: 0,
      cogs: 0,
      gross_profit: 0,
      collected: 110000,
    });
    const weeks = reportTrend(report, "week", range);
    expect(weeks).toMatchObject([
      {
        date: "2026-09-28",
        end_date: "2026-10-04",
        order_count: 1,
        net_sales: 90000,
        gross_profit: 50000,
        collected: 0,
      },
      {
        date: "2026-10-05",
        end_date: "2026-10-11",
        order_count: 1,
        net_sales: 90000,
        gross_profit: 50000,
        collected: 110000,
      },
    ]);
    expect(weeks.reduce((sum, row) => sum + row.net_sales, 0)).toBe(
      report.net_sales,
    );
    expect(weeks.reduce((sum, row) => sum + (row.gross_profit ?? 0), 0)).toBe(
      report.gross_profit,
    );
  });

  it("fills missing months and does not move prior-order cash into order revenue", () => {
    const range = { from: "2025-12-31", to: "2026-03-02" };
    const report = buildStoreReport(
      [
        order({ created_at: "2025-12-31T00:00:00Z", paid_at: null }),
        order({
          id: "march",
          created_at: "2026-03-01T00:00:00Z",
          paid_at: "2026-03-01T00:00:00Z",
        }),
        order({
          id: "prior-refund",
          created_at: "2025-11-30T00:00:00Z",
          payment_status: "refunded",
          paid_at: "2025-11-30T00:00:00Z",
          refunded_at: "2026-01-15T00:00:00Z",
        }),
      ],
      range,
    );
    const months = reportTrend(report, "month", range);
    expect(months.map((row) => row.date)).toEqual([
      "2025-12-01",
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
    expect(months[1]).toMatchObject({
      order_count: 0,
      net_sales: 0,
      gross_profit: 0,
      refunded: 110000,
    });
    expect(months[2]).toMatchObject({
      order_count: 0,
      net_sales: 0,
      gross_profit: 0,
      collected: 0,
      refunded: 0,
      end_date: "2026-02-28",
    });
    expect(
      months.reduce((sum, row) => sum + row.collected - row.refunded, 0),
    ).toBe(report.net_collected);
    const csv = reportCsv(report, "month", range);
    expect(csv).toContain('"Tháng (Việt Nam)"');
    expect(csv).toContain('"2026-02-01","0","0"');
    expect(csv).toContain('"Đơn hoàn tất đã thanh toán","2"');
  });

  it("propagates unknown cost only to affected buckets and preserves damaged-return losses", () => {
    const range = { from: "2026-10-01", to: "2026-10-31" };
    const report = buildStoreReport(
      [
        order({ paid_at: null }),
        order({
          id: "unknown",
          created_at: "2026-10-02T00:00:00Z",
          paid_at: null,
          items: [
            {
              id: "unknown",
              product_id: "unknown",
              name: "Unknown",
              price: 100000,
              quantity: 1,
              unit_cost: null,
            },
          ],
        }),
        order({
          id: "damaged",
          created_at: "2026-10-12T00:00:00Z",
          status: "returned",
          payment_status: "refunded",
          return_restocked: false,
          paid_at: null,
          refunded_at: null,
        }),
      ],
      range,
    );
    const weeks = reportTrend(report, "week", range);
    expect(weeks[0]).toMatchObject({
      net_sales: 180000,
      cogs: null,
      gross_profit: null,
    });
    expect(weeks[1]).toMatchObject({ net_sales: 0, cogs: 0, gross_profit: 0 });
    expect(weeks[2]).toMatchObject({
      net_sales: 0,
      cogs: 40000,
      gross_profit: -40000,
    });
    expect(reportTrend(report, "month", range)[0]).toMatchObject({
      net_sales: 180000,
      cogs: null,
      gross_profit: null,
    });
    expect(reportCsv(report, "week", range)).toContain('"Chưa đủ giá vốn"');
  });

  it("keeps empty and reversed ranges empty", () => {
    const range = { from: "2026-10-01", to: "2026-10-31" };
    expect(reportTrend(buildStoreReport([], range), "month", range)).toEqual(
      [],
    );
    expect(
      reportTrend(buildStoreReport([order()], range), "day", {
        from: "2026-11-01",
        to: "2026-10-01",
      }),
    ).toEqual([]);
  });
});

describe("payment revenue shares", () => {
  it("uses discounted merchandise revenue while cash keeps independent collection and refund dates", () => {
    const range = { from: "2026-10-01", to: "2026-10-31" };
    const report = buildStoreReport(
      [
        order({ id: "cod", paid_at: "2026-11-01T00:00:00Z" }),
        order({
          id: "bank",
          payment_method: "bank_transfer",
          subtotal: 300000,
          discount_amount: 30000,
          total: 290000,
        }),
        order({
          id: "cancelled",
          status: "cancelled",
          payment_method: "bank_transfer",
        }),
        order({
          id: "refunded",
          payment_status: "refunded",
          refunded_at: "2026-10-02T00:00:00Z",
        }),
        order({
          id: "old",
          created_at: "2026-09-01T00:00:00Z",
          total: 500000,
          payment_method: "bank_transfer",
        }),
      ],
      range,
    );
    expect(
      report.payment_breakdown.find((row) => row.method === "cod"),
    ).toMatchObject({ net_sales: 90000, collected: 110000, refunded: 110000 });
    expect(
      report.payment_breakdown.find((row) => row.method === "bank_transfer"),
    ).toMatchObject({ net_sales: 270000, collected: 900000 });
    expect(
      report.payment_breakdown.reduce((sum, row) => sum + row.net_sales, 0),
    ).toBe(report.net_sales);
    const html = renderToStaticMarkup(
      createElement(PaymentShareChart, { report }),
    );
    expect(html).toContain("25.0%");
    expect(html).toContain("75.0%");
    expect(html).toContain("Không gồm phí giao hàng");
    const csv = reportCsv(report);
    expect(csv).toContain('"cod","2","90000","25"');
    expect(csv).toContain('"bank_transfer","2","270000","75"');
  });

  it("preserves legacy unknown methods and avoids drawing an empty donut", () => {
    const range = { from: "2026-10-01", to: "2026-10-31" };
    const report = buildStoreReport(
      [order({ payment_method: undefined })],
      range,
    );
    expect(
      renderToStaticMarkup(createElement(PaymentShareChart, { report })),
    ).toContain("Chưa xác định");
    const empty = renderToStaticMarkup(
      createElement(PaymentShareChart, { report: buildStoreReport([], range) }),
    );
    expect(empty).toContain("Chưa có doanh thu");
    expect(empty).not.toContain("<svg");
  });
});

describe("finance chart rendering", () => {
  it("breaks the profit line across unknown costs and renders negative profit without nonfinite geometry", () => {
    const range = { from: "2026-10-01", to: "2026-10-03" };
    const report = buildStoreReport(
      [
        order({ paid_at: null }),
        order({
          id: "unknown",
          created_at: "2026-10-02T00:00:00Z",
          paid_at: null,
          items: [
            {
              id: "unknown",
              product_id: "unknown",
              name: "Unknown",
              price: 100000,
              quantity: 1,
            },
          ],
        }),
        order({
          id: "damaged",
          created_at: "2026-10-03T00:00:00Z",
          status: "returned",
          payment_status: "refunded",
          return_restocked: false,
          paid_at: null,
          refunded_at: null,
        }),
      ],
      range,
    );
    const html = renderToStaticMarkup(
      createElement(FinanceTrendChart, {
        rows: reportTrend(report, "day", range),
        grouping: "day",
      }),
    );
    const profitPath = html.match(
      /data-series="gross-profit" d="([^"]*)"/,
    )?.[1];
    expect(profitPath?.match(/M/g)).toHaveLength(2);
    expect(profitPath).not.toContain("L");
    expect(profitPath).toContain(",230");
    expect(html).toContain("Lợi nhuận âm được vẽ dưới đường 0");
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(html).toContain("chưa đủ giá vốn");
  });
});
