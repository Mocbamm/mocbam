import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsManager } from "@/components/admin/analytics-manager";
import { TrafficManager } from "@/components/admin/traffic-manager";
import type { ReportOrder } from "@/lib/store-reports";
import type { TrafficReport } from "@/lib/traffic-reports";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/analytics",
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => createElement("a", { href, ...props }, children),
}));

function order(overrides: Partial<ReportOrder> = {}): ReportOrder {
  return {
    id: "order",
    created_at: "2026-10-02T03:00:00Z",
    status: "completed",
    payment_status: "paid",
    payment_method: "cod",
    paid_at: "2026-10-03T03:00:00Z",
    refunded_at: null,
    subtotal: 200000,
    discount_amount: 20000,
    shipping_fee: 30000,
    total: 210000,
    items: [
      {
        id: "line",
        product_id: "gau",
        name: "Gấu Mộc len móc",
        price: 200000,
        quantity: 1,
        unit_cost: 80000,
        line_discount: 20000,
      },
    ],
    ...overrides,
  };
}
// A custom range compares with the ten days immediately before it.
const range = { from: "2026-10-01", to: "2026-10-10" };
function renderFinance(orders: ReportOrder[]) {
  return renderToStaticMarkup(
    createElement(AnalyticsManager, { orders, initialRange: range }),
  )
    .replaceAll("<!-- -->", "")
    .replaceAll(" ", " ");
}

describe("finance report screen", () => {
  it("leads with a plain summary, comparison and four explained headline numbers", () => {
    const html = renderFinance([
      order(),
      order({ id: "second", created_at: "2026-10-05T03:00:00Z" }),
      order({
        id: "cancelled",
        created_at: "2026-10-06T03:00:00Z",
        status: "cancelled",
        payment_status: "awaiting_payment",
        paid_at: null,
      }),
      order({
        id: "previous",
        created_at: "2026-09-25T03:00:00Z",
        paid_at: "2026-09-26T03:00:00Z",
      }),
    ]);
    expect(html).toContain(
      "Từ 01/10 đến 10/10/2026, cửa hàng có <strong>3 đơn hàng</strong>",
    );
    expect(html).toContain("doanh thu <strong>360.000 ₫</strong>");
    expect(html).toContain("lãi gộp ước tính <strong>200.000 ₫</strong>");
    expect(html).toContain("tăng 100%");
    expect(html).toContain("khoảng thời gian liền trước (21/09 – 30/09/2026)");
    expect(html).toContain("1 đơn bị hủy");
    for (const label of [
      "Doanh thu",
      "Lãi gộp ước tính",
      "Số đơn hàng",
      "Tiền thực nhận",
      "Từ tiền hàng đến tiền lãi",
      "Sản phẩm bán chạy",
      "Khách thanh toán bằng cách nào?",
      "Tình trạng đơn hàng",
      "Tất cả chỉ số chi tiết",
    ])
      expect(html).toContain(label);
    // Every previously reported metric remains available in the details.
    for (const label of [
      "Tổng tiền hàng (GMV)",
      "Giá trị trung bình đơn hoàn tất (AOV)",
      "Chi phí hàng hoàn không nhập kho",
      "Phí giao hàng trên đơn còn hiệu lực",
      "Thu ròng trong kỳ",
      "Chờ ghi nhận thanh toán",
    ])
      expect(html).toContain(label);
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("explains missing costs instead of inventing profit", () => {
    const html = renderFinance([
      order({
        items: [
          {
            id: "legacy",
            product_id: "gau",
            name: "Gấu Mộc len móc",
            price: 200000,
            quantity: 1,
            unit_cost: null,
            line_discount: 20000,
          },
        ],
      }),
    ]);
    expect(html).toContain("Chưa tính được lãi gộp của cả kỳ");
    expect(html).toContain("1/1 đơn được đặt khi sản phẩm chưa có giá vốn");
    expect(html).toContain('href="/admin/products"');
    expect(html).toContain("Chưa tính được");
    expect(html).not.toContain("lãi gộp ước tính <strong>");
  });

  it("offers next steps for an empty period and a brand-new shop", () => {
    const empty = renderFinance([
      order({ created_at: "2026-08-01T03:00:00Z", paid_at: null }),
    ]);
    expect(empty).toContain("Từ 01/10 đến 10/10/2026 chưa có đơn hàng nào.");
    expect(empty).toContain("Xem 30 ngày qua");
    // Zero-only breakdowns are skipped; the full metric list stays available.
    expect(empty).not.toContain("Từ tiền hàng đến tiền lãi");
    expect(empty).toContain("Tất cả chỉ số chi tiết");
    expect(empty).not.toContain("Không đổi");
    const none = renderFinance([]);
    expect(none).toContain("Cửa hàng chưa có đơn hàng nào");
  });
});

function trafficReport(overrides: Partial<TrafficReport> = {}): TrafficReport {
  const row = (
    name: string,
    sessions: number,
    revenue: number | null = null,
  ) => ({
    name,
    users: sessions,
    sessions,
    views: sessions * 2,
    engagement_rate: 0.6,
    bounce_rate: 0.4,
    revenue,
    successful_orders: revenue === null ? null : 1,
  });
  return {
    configured: true,
    range,
    fetched_at: "2026-10-10T05:00:00Z",
    timezone: "Asia/Ho_Chi_Minh",
    metrics: {
      totalUsers: 80,
      activeUsers: 78,
      sessions: 100,
      screenPageViews: 250,
      engagedSessions: 60,
      engagementRate: 0.6,
      bounceRate: 0.4,
      averageSessionDuration: 136.4,
    },
    pages_per_session: 2.5,
    successful_order_conversion_rate: 0.04,
    commerce: {
      successful_orders: 4,
      attributed_orders: 3,
      landing_revenue: [{ name: "/", orders: 1, revenue: 180000 }],
      pending_events: 0,
      expired_events: 0,
      uncertain_events: 0,
    },
    commerce_error: null,
    purchase_tracking_configured: false,
    trend: [
      { date: "2026-10-09", users: 30, sessions: 40, views: 90 },
      { date: "2026-10-10", users: 50, sessions: 60, views: 160 },
    ],
    trend_error: null,
    realtime: { users: 2, views: 5 },
    realtime_error: null,
    sources: [
      row("m.facebook.com / referral", 30),
      row("google / organic", 25),
      row("facebook.com / referral", 20),
      row("(direct) / (none)", 25),
    ],
    landing_pages: [row("/", 60, 180000), row("/san-pham/gau", 40, 0)],
    devices: [row("mobile", 70), row("desktop", 30)],
    events: [{ name: "add_to_cart", count: 12, users: 10 }],
    funnel: [
      {
        name: "1. session_start",
        users: 80,
        completion_rate: 0.5,
        abandonments: 40,
      },
      {
        name: "2. view_item",
        users: 40,
        completion_rate: 0.25,
        abandonments: 30,
      },
      {
        name: "3. add_to_cart",
        users: 10,
        completion_rate: 0.6,
        abandonments: 4,
      },
      {
        name: "4. begin_checkout",
        users: 6,
        completion_rate: 0.5,
        abandonments: 3,
      },
      { name: "5. purchase", users: 3, completion_rate: 0, abandonments: 0 },
    ],
    funnel_error: null,
    truncated: false,
    thresholded: false,
    sampled: false,
    ...overrides,
  };
}
function renderTraffic(
  initialState: Parameters<typeof TrafficManager>[0]["initialState"],
) {
  return renderToStaticMarkup(
    createElement(TrafficManager, { initialRange: range, initialState }),
  )
    .replaceAll("<!-- -->", "")
    .replaceAll(" ", " ");
}

describe("website traffic screen", () => {
  it("summarises visitors, sources, orders and the funnel in plain words", () => {
    const html = renderTraffic(trafficReport());
    expect(html).toContain(
      "Từ 01/10 đến 10/10/2026 có <strong>80 người</strong> ghé website qua <strong>100 lượt truy cập</strong>",
    );
    expect(html).toContain(
      "Khách đến nhiều nhất từ <strong>Facebook</strong> (50%",
    );
    expect(html).toContain("dùng <strong>điện thoại</strong>");
    expect(html).toContain(
      "<strong>4 đơn</strong> đã giao và thanh toán thành công",
    );
    expect(html).toContain(
      "cứ khoảng <strong>25 lượt truy cập</strong> có 1 đơn",
    );
    expect(html).toContain(
      "<strong>Xem sản phẩm → Thêm vào giỏ</strong>: chỉ 25% đi tiếp",
    );
    expect(html).toContain("2 phút 16 giây");
    expect(html).toContain("Vào thẳng website");
    expect(html).toContain("Trang chủ");
    expect(html).toContain("180.000 ₫");
    expect(html).toContain("Bước “Mua thành công” chưa được ghi nhận");
    for (const label of [
      "Người ghé thăm",
      "Lượt truy cập",
      "Lượt xem trang",
      "Tỷ lệ đặt hàng thành công",
      "Số trang mỗi lượt",
      "Rời đi ngay",
      "Khách đi đến bước mua hàng như thế nào?",
      "Mỗi ngày có bao nhiêu người ghé website?",
      "Khách đến từ đâu?",
      "Khách dùng thiết bị gì?",
      "Khách vào website từ trang nào?",
    ])
      expect(html).toContain(label);
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
  });

  it("explains a missing Google Analytics connection with a next step", () => {
    const html = renderTraffic({
      configured: false,
      range,
      reason: "Chưa kết nối quyền đọc báo cáo GA4.",
    });
    expect(html).toContain("Chưa kết nối Google Analytics");
    expect(html).toContain("Việc cần làm");
    expect(html).toContain("Thông tin cho kỹ thuật viên");
    expect(html).toContain("Chưa kết nối quyền đọc báo cáo GA4.");
    expect(html).toContain(
      'href="/admin/analytics?from=2026-10-01&amp;to=2026-10-10"',
    );
    expect(html).not.toContain("Tỷ lệ đặt hàng thành công");
  });

  it("keeps unknown ledger values and reconciliation warnings visible", () => {
    const html = renderTraffic(
      trafficReport({
        commerce: null,
        commerce_error: "Chưa đọc được sổ đơn hàng.",
        successful_order_conversion_rate: null,
        purchase_tracking_configured: true,
        funnel: null,
        funnel_error: "Phễu tạm chưa đọc được.",
      }),
    );
    expect(html).toContain("Chưa có dữ liệu");
    expect(html).toContain("Chưa đọc được sổ đơn hàng.");
    expect(html).toContain("Phễu tạm chưa đọc được.");
    expect(html).not.toContain("Bước “Mua thành công” chưa được ghi nhận");
    const warning = renderTraffic(
      trafficReport({
        commerce: {
          ...trafficReport().commerce!,
          uncertain_events: 1,
        },
      }),
    );
    expect(warning).toContain("Cần kỹ thuật viên kiểm tra");
  });
});
