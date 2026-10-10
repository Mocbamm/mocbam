import { csvCell, type ReportRange } from "./store-reports";

export const trafficMetricNames = [
  "totalUsers",
  "activeUsers",
  "sessions",
  "screenPageViews",
  "engagedSessions",
  "engagementRate",
  "bounceRate",
  "averageSessionDuration",
] as const;
export type TrafficMetric = (typeof trafficMetricNames)[number];
export type GaTable = {
  dimensionHeaders?: { name?: string }[];
  metricHeaders?: { name?: string }[];
  rows?: {
    dimensionValues?: { value?: string }[];
    metricValues?: { value?: string }[];
  }[];
  rowCount?: number;
  metadata?: {
    timeZone?: string;
    subjectToThresholding?: boolean;
    samplingMetadatas?: {
      samplesReadCount?: string;
      samplingSpaceSize?: string;
    }[];
  };
};
export type TrafficRow = {
  name: string;
  users: number;
  sessions: number;
  views: number;
  engagement_rate: number;
  bounce_rate: number;
  revenue: number | null;
  successful_orders: number | null;
};
export type TrafficCommerce = {
  successful_orders: number;
  attributed_orders: number;
  landing_revenue: { name: string; orders: number; revenue: number }[];
  pending_events: number;
  expired_events: number;
  uncertain_events: number;
};
export type TrafficReport = {
  configured: true;
  range: ReportRange;
  fetched_at: string;
  timezone: string;
  metrics: Record<TrafficMetric, number>;
  pages_per_session: number | null;
  successful_order_conversion_rate: number | null;
  commerce: TrafficCommerce | null;
  commerce_error: string | null;
  purchase_tracking_configured: boolean;
  trend: { date: string; users: number; sessions: number; views: number }[];
  trend_error: string | null;
  realtime: { users: number; views: number } | null;
  realtime_error: string | null;
  sources: TrafficRow[];
  landing_pages: TrafficRow[];
  devices: TrafficRow[];
  events: { name: string; count: number; users: number }[];
  funnel:
    | {
        name: string;
        users: number;
        completion_rate: number;
        abandonments: number;
      }[]
    | null;
  funnel_error: string | null;
  truncated: boolean;
  thresholded: boolean;
  sampled: boolean;
};
export type TrafficState =
  | TrafficReport
  | { configured: false; range: ReportRange; reason: string };
function number(value: string | undefined) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? result : 0;
}
export function gaRows(table: GaTable) {
  return (table.rows ?? []).map((row) => ({
    dimensions: Object.fromEntries(
      (table.dimensionHeaders ?? []).map((header, index) => [
        header.name ?? "",
        row.dimensionValues?.[index]?.value ?? "",
      ]),
    ),
    metrics: Object.fromEntries(
      (table.metricHeaders ?? []).map((header, index) => [
        header.name ?? "",
        number(row.metricValues?.[index]?.value),
      ]),
    ),
  }));
}
export function mapTrafficReport(
  tables: GaTable[],
  realtime: GaTable | null,
  funnel: GaTable | null,
  range: ReportRange,
  trend: GaTable | null = null,
): TrafficReport {
  const summary = gaRows(tables[0])[0]?.metrics ?? {};
  function breakdown(table: GaTable): TrafficRow[] {
    return gaRows(table).map((row) => ({
      name: Object.values(row.dimensions)[0] || "(not set)",
      users: row.metrics.totalUsers ?? 0,
      sessions: row.metrics.sessions ?? 0,
      views: row.metrics.screenPageViews ?? 0,
      engagement_rate: row.metrics.engagementRate ?? 0,
      bounce_rate:
        row.metrics.bounceRate ?? 1 - (row.metrics.engagementRate ?? 0),
      revenue: null,
      successful_orders: null,
    }));
  }
  const live = realtime ? (gaRows(realtime)[0]?.metrics ?? {}) : null;
  const observedTrend = trend
    ? gaRows(trend)
        .map((row) => ({
          date: row.dimensions.date.replace(
            /^(\d{4})(\d{2})(\d{2})$/,
            "$1-$2-$3",
          ),
          users: row.metrics.totalUsers ?? 0,
          sessions: row.metrics.sessions ?? 0,
          views: row.metrics.screenPageViews ?? 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const daily = new Map(observedTrend.map((row) => [row.date, row]));
  const trendRows: TrafficReport["trend"] = [];
  const completeTrend =
    trend &&
    !trend.metadata?.subjectToThresholding &&
    !trend.metadata?.samplingMetadatas?.some(
      (sample) =>
        Number(sample.samplesReadCount) < Number(sample.samplingSpaceSize),
    ) &&
    (trend.rowCount ?? 0) <= (trend.rows?.length ?? 0);
  if (completeTrend) {
    const end = Date.parse(`${range.to}T00:00:00Z`);
    // A complete successful GA query omits dates with no events. Fill those
    // calendar dates only; a failed/unavailable query remains null upstream.
    for (
      let day = Date.parse(`${range.from}T00:00:00Z`);
      day <= end && trendRows.length < 10000;
      day += 86_400_000
    ) {
      const date = new Date(day).toISOString().slice(0, 10);
      trendRows.push(
        daily.get(date) ?? { date, users: 0, sessions: 0, views: 0 },
      );
    }
  } else trendRows.push(...observedTrend);
  return {
    configured: true,
    range,
    fetched_at: new Date().toISOString(),
    timezone: tables[0].metadata?.timeZone ?? "Theo cài đặt thuộc tính GA4",
    metrics: Object.fromEntries(
      trafficMetricNames.map((name) => [name, summary[name] ?? 0]),
    ) as Record<TrafficMetric, number>,
    pages_per_session: summary.sessions
      ? (summary.screenPageViews ?? 0) / summary.sessions
      : null,
    successful_order_conversion_rate: null,
    commerce: null,
    commerce_error: null,
    purchase_tracking_configured: false,
    trend: trendRows,
    trend_error: null,
    realtime: live
      ? { users: live.activeUsers ?? 0, views: live.screenPageViews ?? 0 }
      : null,
    realtime_error: null,
    sources: breakdown(tables[1]),
    landing_pages: breakdown(tables[2]),
    devices: breakdown(tables[3]),
    events: gaRows(tables[4]).map((row) => ({
      name: row.dimensions.eventName,
      count: row.metrics.eventCount ?? 0,
      users: row.metrics.totalUsers ?? 0,
    })),
    funnel: funnel
      ? gaRows(funnel).map((row) => ({
          name:
            row.dimensions.funnelStepName ||
            Object.values(row.dimensions)[0] ||
            "",
          users: row.metrics.activeUsers ?? 0,
          completion_rate: row.metrics.funnelStepCompletionRate ?? 0,
          abandonments: row.metrics.funnelStepAbandonments ?? 0,
        }))
      : null,
    funnel_error: null,
    truncated:
      Boolean(
        trend &&
          Date.parse(`${range.to}T00:00:00Z`) -
            Date.parse(`${range.from}T00:00:00Z`) >=
            10000 * 86_400_000,
      ) ||
      [...tables, ...(trend ? [trend] : [])].some(
        (table) => (table.rowCount ?? 0) > (table.rows?.length ?? 0),
      ),
    thresholded: tables.some((table) => table.metadata?.subjectToThresholding),
    sampled: [...tables, ...(funnel ? [funnel] : [])].some((table) =>
      table.metadata?.samplingMetadatas?.some(
        (sample) =>
          Number(sample.samplesReadCount) < Number(sample.samplingSpaceSize),
      ),
    ),
  };
}
export function trafficCsv(state: TrafficState) {
  const rows: (string | number)[][] = [
    ["Nguồn", "Google Analytics 4"],
    ["Từ ngày", state.range.from],
    ["Đến ngày", state.range.to],
  ];
  if (!state.configured) rows.push(["Trạng thái", state.reason]);
  else {
    rows.push(
      ["Múi giờ thuộc tính", state.timezone],
      ["Cập nhật", state.fetched_at],
      [],
      ["Chỉ số", "Giá trị"],
    );
    for (const [key, value] of Object.entries(state.metrics))
      rows.push([key, value]);
    rows.push(
      ["Số trang / phiên", state.pages_per_session ?? "Không có phiên"],
      [
        "Đơn thành công / phiên GA4",
        state.successful_order_conversion_rate ?? "Chưa có dữ liệu",
      ],
      [
        "Đơn thành công (đã giao + đã thanh toán)",
        state.commerce?.successful_orders ?? "Chưa đọc được sổ đơn hàng",
      ],
      [
        "Đơn thành công có nguồn trang đích",
        state.commerce?.attributed_orders ?? "Chưa đọc được sổ đơn hàng",
      ],
      [
        "Kết nối gửi purchase/refund",
        state.purchase_tracking_configured ? "Đã cấu hình" : "Chưa cấu hình",
      ],
      ["Sự kiện chờ gửi", state.commerce?.pending_events ?? "Chưa đọc được"],
      [
        "Sự kiện quá 72 giờ không thể gửi bù",
        state.commerce?.expired_events ?? "Chưa đọc được",
      ],
      [
        "Sự kiện hoàn tiền cần đối soát GA4 trước khi gửi lại",
        state.commerce?.uncertain_events ?? "Chưa đọc được",
      ],
    );
    if (state.realtime)
      rows.push(
        ["Người dùng hoạt động 30 phút gần nhất", state.realtime.users],
        ["Lượt xem 30 phút gần nhất", state.realtime.views],
      );
    for (const [label, values] of [
      ["Nguồn truy cập", state.sources],
      ["Trang đích", state.landing_pages],
      ["Thiết bị", state.devices],
    ] as const) {
      rows.push(
        [],
        [
          label,
          "Người dùng",
          "Phiên",
          "Lượt xem",
          "Tỷ lệ tương tác",
          "Tỷ lệ thoát",
          "Doanh thu đơn thành công (VND)",
          "Đơn thành công",
        ],
      );
      for (const row of values)
        rows.push([
          row.name,
          row.users,
          row.sessions,
          row.views,
          row.engagement_rate,
          row.bounce_rate,
          row.revenue ?? "Chưa có dữ liệu",
          row.successful_orders ?? "Chưa có dữ liệu",
        ]);
    }
    rows.push([], ["Ngày", "Người dùng", "Phiên", "Lượt xem"]);
    for (const row of state.trend)
      rows.push([row.date, row.users, row.sessions, row.views]);
    if (state.trend_error)
      rows.push(["Xu hướng chưa có dữ liệu", state.trend_error]);
    if (state.commerce_error)
      rows.push(["Sổ đơn hàng chưa có dữ liệu", state.commerce_error]);
    if (state.commerce) {
      rows.push(
        [],
        [
          "Trang đích có doanh thu (toàn bộ)",
          "Đơn thành công",
          "Doanh thu (VND)",
        ],
      );
      for (const row of state.commerce.landing_revenue)
        rows.push([row.name, row.orders, row.revenue]);
    }
    rows.push([], ["Sự kiện", "Số lần", "Người dùng"]);
    for (const row of state.events) rows.push([row.name, row.count, row.users]);
    rows.push(
      [],
      ["Phễu tuần tự", "Người dùng", "Tỷ lệ hoàn thành bước", "Rời phễu"],
    );
    for (const row of state.funnel ?? [])
      rows.push([row.name, row.users, row.completion_rate, row.abandonments]);
    if (state.funnel_error)
      rows.push(["Phễu chưa có dữ liệu", state.funnel_error]);
    if (state.realtime_error)
      rows.push(["Thời gian thực chưa có dữ liệu", state.realtime_error]);
    if (state.truncated)
      rows.push([
        "Giới hạn",
        "Bảng hiển thị tối đa 100 nguồn/trang đích và 20 loại thiết bị; tổng quan lấy toàn bộ dữ liệu.",
      ]);
    if (state.sampled)
      rows.push([
        "Lưu ý",
        "Google lấy mẫu một phần dữ liệu cho báo cáo/phễu này.",
      ]);
    if (state.thresholded)
      rows.push(["Lưu ý", "Google áp dụng ngưỡng bảo vệ dữ liệu cho báo cáo."]);
  }
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
