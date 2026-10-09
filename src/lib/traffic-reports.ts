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
};
export type TrafficReport = {
  configured: true;
  range: ReportRange;
  fetched_at: string;
  timezone: string;
  metrics: Record<TrafficMetric, number>;
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
): TrafficReport {
  const summary = gaRows(tables[0])[0]?.metrics ?? {};
  function breakdown(table: GaTable): TrafficRow[] {
    return gaRows(table).map((row) => ({
      name: Object.values(row.dimensions)[0] || "(not set)",
      users: row.metrics.totalUsers ?? 0,
      sessions: row.metrics.sessions ?? 0,
      views: row.metrics.screenPageViews ?? 0,
      engagement_rate: row.metrics.engagementRate ?? 0,
    }));
  }
  const live = realtime ? (gaRows(realtime)[0]?.metrics ?? {}) : null;
  return {
    configured: true,
    range,
    fetched_at: new Date().toISOString(),
    timezone: tables[0].metadata?.timeZone ?? "Theo cài đặt thuộc tính GA4",
    metrics: Object.fromEntries(
      trafficMetricNames.map((name) => [name, summary[name] ?? 0]),
    ) as Record<TrafficMetric, number>,
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
    truncated: tables.some(
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
        [label, "Người dùng", "Phiên", "Lượt xem", "Tỷ lệ tương tác"],
      );
      for (const row of values)
        rows.push([
          row.name,
          row.users,
          row.sessions,
          row.views,
          row.engagement_rate,
        ]);
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
