"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  reportPeriodRange,
  type ReportPeriod,
  type ReportRange,
} from "@/lib/store-reports";
import {
  trafficCsv,
  type TrafficRow,
  type TrafficState,
  type TrafficReport,
} from "@/lib/traffic-reports";
import { fieldClass, panelClass } from "./admin-common";

const periods: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "year", label: "Năm nay" },
];
const eventLabels: Record<string, string> = {
  session_start: "Ghé thăm website",
  view_item: "Xem sản phẩm",
  add_to_cart: "Thêm vào giỏ",
  begin_checkout: "Bắt đầu thanh toán",
  order_submitted: "Gửi đơn hàng",
  purchase: "Mua hàng thành công",
  refund: "Đã hoàn tiền",
};
function percent(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
function count(value: number) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}
function TrafficTable({
  title,
  rows,
  landing = false,
}: {
  title: string;
  rows: TrafficRow[];
  landing?: boolean;
}) {
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">{title}</h2>
      {!rows.length ? (
        <p className="mt-4 text-sm text-[#6b7867]">
          Nguồn GA4 chưa ghi nhận dữ liệu trong kỳ.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[#6b7867]">
              <tr>
                {[
                  title,
                  "Người dùng",
                  "Phiên",
                  "Lượt xem",
                  "Tỷ lệ thoát",
                  ...(landing
                    ? ["Đơn thành công", "Doanh thu (VND)"]
                    : ["Tương tác"]),
                ].map((label) => (
                  <th key={label} className="py-3 pr-4 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-t border-[#edf0e7]">
                  <th className="max-w-64 break-words py-3 pr-4 font-medium">
                    {row.name}
                  </th>
                  <td className="pr-4">{count(row.users)}</td>
                  <td className="pr-4">{count(row.sessions)}</td>
                  <td className="pr-4">{count(row.views)}</td>
                  <td className="pr-4">{percent(row.bounce_rate)}</td>
                  {landing ? (
                    <>
                      <td className="pr-4">
                        {row.successful_orders == null
                          ? "Chưa có dữ liệu"
                          : count(row.successful_orders)}
                      </td>
                      <td>
                        {row.revenue == null
                          ? "Chưa có dữ liệu"
                          : count(row.revenue)}
                      </td>
                    </>
                  ) : (
                    <td>{percent(row.engagement_rate)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UserTrend({ report }: { report: TrafficReport }) {
  const points = report.trend;
  const observedMax = Math.max(0, ...points.map((point) => point.users));
  const max = Math.max(1, observedMax);
  const firstDate = points.length ? Date.parse(points[0].date) : 0;
  const dateSpan = points.length
    ? Date.parse(points.at(-1)!.date) - firstDate
    : 0;
  const coords = points.map((point) => ({
    x: dateSpan
      ? 44 + ((Date.parse(point.date) - firstDate) / dateSpan) * 676
      : 360,
    y: 182 - (point.users / max) * 150,
  }));
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Xu hướng người dùng theo ngày</h2>
      {report.trend_error ? (
        <p className="mt-4 text-sm text-[#6b7867]">{report.trend_error}</p>
      ) : !points.length ? (
        <p className="mt-4 text-sm text-[#6b7867]">
          GA4 chưa ghi nhận người dùng trong kỳ.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 760 224"
              role="img"
              aria-label={`Biểu đồ người dùng từ ${points[0].date} đến ${points.at(-1)?.date}; cao nhất ${count(observedMax)} người một ngày`}
              className="mt-4 w-full min-w-[600px]"
            >
              {[0, 0.5, 1].map((fraction) => (
                <g key={fraction}>
                  <line
                    x1="44"
                    x2="720"
                    y1={182 - fraction * 150}
                    y2={182 - fraction * 150}
                    stroke="#e3e8dc"
                  />
                  <text
                    x="35"
                    y={186 - fraction * 150}
                    textAnchor="end"
                    fontSize="11"
                    fill="#6b7867"
                  >
                    {count(max * fraction)}
                  </text>
                </g>
              ))}
              <polygon
                points={`${coords[0].x},182 ${line} ${coords.at(-1)?.x},182`}
                fill="#dce8cd"
              />
              <polyline
                points={line}
                fill="none"
                stroke="#557a3d"
                strokeWidth="2.5"
              />
              {points.map((point, index) => (
                <circle
                  key={point.date}
                  cx={coords[index].x}
                  cy={coords[index].y}
                  r="3"
                  fill="#557a3d"
                  tabIndex={0}
                  aria-label={`${point.date}: ${count(point.users)} người dùng, ${count(point.sessions)} phiên`}
                >
                  <title>
                    {point.date}: {count(point.users)} người dùng ·{" "}
                    {count(point.sessions)} phiên
                  </title>
                </circle>
              ))}
              <text x="44" y="211" fontSize="11" fill="#6b7867">
                {points[0].date}
              </text>
              <text
                x="720"
                y="211"
                textAnchor="end"
                fontSize="11"
                fill="#6b7867"
              >
                {points.at(-1)?.date}
              </text>
            </svg>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium">
              Xem số liệu theo ngày
            </summary>
            <div className="mt-3 max-h-72 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    {["Ngày", "Người dùng", "Phiên", "Lượt xem"].map(
                      (label) => (
                        <th key={label} className="py-2">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.date} className="border-t border-[#edf0e7]">
                      <th className="py-2 font-medium">{point.date}</th>
                      <td>{count(point.users)}</td>
                      <td>{count(point.sessions)}</td>
                      <td>{count(point.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function SourceBars({ rows }: { rows: TrafficRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.sessions));
  return (
    <section className={panelClass}>
      <h2 className="font-semibold">Nguồn truy cập · số phiên</h2>
      {!rows.length ? (
        <p className="mt-4 text-sm text-[#6b7867]">
          GA4 chưa ghi nhận nguồn truy cập trong kỳ.
        </p>
      ) : (
        <ol className="mt-5 space-y-4">
          {[...rows]
            .sort((a, b) => b.sessions - a.sessions)
            .slice(0, 10)
            .map((row) => (
              <li key={row.name}>
                <div className="mb-1 flex justify-between gap-3 text-xs">
                  <span className="break-all">{row.name}</span>
                  <span className="shrink-0">{count(row.sessions)} phiên</span>
                </div>
                <div className="h-3 rounded-full bg-[#edf1e7]">
                  <div
                    className="h-full rounded-full bg-[#739254]"
                    style={{ width: `${(row.sessions / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
        </ol>
      )}
    </section>
  );
}
export function TrafficManager({
  initialRange,
  initialState,
}: {
  initialRange: ReportRange;
  initialState?: TrafficState;
}) {
  const [range, setRange] = useState(initialRange);
  const [result, setResult] = useState<TrafficState | null>(
    initialState ?? null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!initialState);
  const [live, setLive] = useState(false);
  const [revision, setRevision] = useState(0);
  const invalidRange = !range.from || !range.to || range.from > range.to;
  useEffect(() => {
    if (invalidRange) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/traffic?${new URLSearchParams(range)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Không thể tải báo cáo GA4.");
        if (!controller.signal.aborted) setResult(data as TrafficState);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Không thể tải báo cáo GA4.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [invalidRange, range, revision]);
  useEffect(() => {
    if (!live) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible")
        setRevision((value) => value + 1);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [live]);
  const current =
    result?.range.from === range.from && result.range.to === range.to
      ? result
      : null;
  const report = current?.configured ? current : null;
  function exportCsv() {
    const state: TrafficState = current ?? {
      configured: false,
      range,
      reason: error || "Chưa tải được dữ liệu nguồn GA4.",
    };
    const url = URL.createObjectURL(
      new Blob([trafficCsv(state)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `moc-bam-luu-luong-${range.from}-${range.to}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
  const metrics = report
    ? [
        ["Người dùng", count(report.metrics.totalUsers)],
        ["Người dùng hoạt động", count(report.metrics.activeUsers)],
        ["Phiên truy cập", count(report.metrics.sessions)],
        ["Lượt xem trang", count(report.metrics.screenPageViews)],
        [
          "Số trang / phiên",
          report.pages_per_session == null
            ? "Không có phiên"
            : count(report.pages_per_session),
        ],
        [
          "Đơn thành công / phiên",
          report.successful_order_conversion_rate == null
            ? "Chưa có dữ liệu"
            : percent(report.successful_order_conversion_rate),
        ],
        ["Phiên có tương tác", count(report.metrics.engagedSessions)],
        ["Tỷ lệ tương tác", percent(report.metrics.engagementRate)],
        ["Tỷ lệ thoát", percent(report.metrics.bounceRate)],
        [
          "Thời lượng phiên trung bình",
          `${count(report.metrics.averageSessionDuration)} giây`,
        ],
      ]
    : [];
  return (
    <div className="space-y-6">
      <div className={panelClass}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-40 flex-1 text-xs text-[#6b7867]">
            Từ ngày
            <input
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={(event) =>
                setRange({ ...range, from: event.target.value })
              }
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="min-w-40 flex-1 text-xs text-[#6b7867]">
            Đến ngày
            <input
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(event) =>
                setRange({ ...range, to: event.target.value })
              }
              className={`${fieldClass} mt-1`}
            />
          </label>
          <Button
            variant="outline"
            disabled={loading || invalidRange}
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Đang tải…" : "Cập nhật"}
          </Button>
          <Button
            variant="outline"
            disabled={invalidRange || loading}
            onClick={exportCsv}
          >
            <Download className="size-4" />
            Xuất CSV
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {periods.map((period) => (
            <Button
              size="sm"
              variant="outline"
              key={period.value}
              onClick={() =>
                setRange(reportPeriodRange(new Date(), period.value))
              }
            >
              {period.label}
            </Button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={live}
              onChange={(event) => setLive(event.target.checked)}
            />
            Tự cập nhật mỗi 30 giây
          </label>
        </div>
        <p className="mt-4 text-xs leading-6 text-[#6b7867]">
          Báo cáo dùng ngày theo múi giờ của thuộc tính GA4
          {report ? ` (${report.timezone})` : ""}. Dữ liệu theo ngày có độ trễ
          xử lý của Google. Thời gian thực luôn là 30 phút gần nhất và độc lập
          với khoảng ngày đã chọn.
        </p>
      </div>
      {invalidRange && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          Chọn ngày bắt đầu và kết thúc hợp lệ.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700"
        >
          {error}
          {report ? " Đang hiển thị lần tải thành công gần nhất." : ""}
        </p>
      )}
      {!invalidRange && current && !current.configured && (
        <section className={`${panelClass} border-dashed`}>
          <h2 className="text-lg font-semibold">
            Chưa có nguồn báo cáo lưu lượng được kết nối
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6b7867]">
            {current.reason}
          </p>
          <p className="mt-3 text-sm leading-7 text-[#6b7867]">
            Khi kết nối, trang sẽ đọc số liệu người dùng, phiên, nguồn truy cập,
            trang đích, thiết bị, sự kiện và phễu mua hàng trực tiếp từ GA4. CSV
            hiện chỉ ghi trạng thái nguồn, không điền số liệu giả.
          </p>
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block text-sm font-medium underline underline-offset-4"
          >
            Mở Google Analytics
          </a>
        </section>
      )}
      {!invalidRange && report && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div key={label} className={panelClass}>
                <p className="text-xs text-[#6b7867]">{label}</p>
                <p className="mt-3 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <section className={panelClass}>
            <h2 className="font-semibold">Thời gian thực · 30 phút gần nhất</h2>
            {report.realtime ? (
              <div className="mt-4 flex flex-wrap gap-8">
                <p>
                  <strong className="text-3xl">
                    {count(report.realtime.users)}
                  </strong>
                  <span className="ml-2 text-sm text-[#6b7867]">
                    người dùng hoạt động
                  </span>
                </p>
                <p>
                  <strong className="text-3xl">
                    {count(report.realtime.views)}
                  </strong>
                  <span className="ml-2 text-sm text-[#6b7867]">lượt xem</span>
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#6b7867]">
                {report.realtime_error}
              </p>
            )}
          </section>
          <UserTrend report={report} />
          <SourceBars rows={report.sources} />
          <section className={`${panelClass} text-sm leading-7`}>
            <h2 className="font-semibold">
              Chuyển đổi và doanh thu theo sổ đơn hàng
            </h2>
            {report.commerce ? (
              <p className="mt-2 text-[#6b7867]">
                {count(report.commerce.successful_orders)} đơn đã giao và đã
                thanh toán; {count(report.commerce.attributed_orders)} đơn có
                trang đích được lưu sau khi khách đồng ý phân tích. Doanh thu
                trang đích là tiền hàng sau voucher của các đơn thành công,
                không gồm phí giao hàng. Đơn hủy, hoàn hàng hoặc đã hoàn tiền
                không được tính.
              </p>
            ) : (
              <p role="status" className="mt-2 text-[#6b7867]">
                {report.commerce_error}
              </p>
            )}
            <p className="mt-2 text-xs text-[#6b7867]">
              Tỷ lệ chuyển đổi = số đơn thành công được tạo trong khoảng ngày đã
              chọn (giờ Việt Nam) / số phiên GA4. Sổ đơn hàng gồm cả khách từ
              chối phân tích, còn GA4 chỉ phản ánh phiên được ghi nhận; tỷ lệ
              này có thể cao hơn thực tế hoặc vượt 100%. Trang đích không có
              nguồn lưu sẽ không được gán doanh thu tùy ý. GA4 dùng tỷ lệ thoát
              theo phiên không có tương tác, khác định nghĩa chỉ xem một trang
              của báo cáo cũ.
            </p>
            {!report.purchase_tracking_configured && (
              <p
                role="status"
                className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900"
              >
                Chưa kết nối gửi sự kiện mua hàng thành công đến GA4. Phễu bước
                cuối cần cấu hình khóa Measurement Protocol trên máy chủ; gửi
                đơn chưa được tính là mua hàng. Sổ đơn hàng và doanh thu trang
                đích vẫn hiển thị khi có nguồn lưu hợp lệ.
              </p>
            )}
            {Boolean(report.commerce?.pending_events) && (
              <p className="mt-2 text-xs text-[#6b7867]">
                {count(report.commerce!.pending_events)} sự kiện đang chờ gửi;
                hệ thống thử lại khi cập nhật đơn hoặc làm mới báo cáo.
              </p>
            )}
            {Boolean(report.commerce?.expired_events) && (
              <p className="mt-2 text-xs text-amber-800">
                {count(report.commerce!.expired_events)} sự kiện quá giới hạn
                gửi bù 72 giờ của GA4. Số liệu sổ đơn hàng vẫn được giữ đầy đủ.
              </p>
            )}
            {Boolean(report.commerce?.uncertain_events) && (
              <p role="status" className="mt-2 text-xs text-amber-800">
                {count(report.commerce!.uncertain_events)} sự kiện hoàn tiền
                chưa rõ GA4 đã nhận hay chưa. Cần đối soát GA4 trước khi gửi lại
                để tránh trừ doanh thu hai lần; sổ đơn hàng không bị ảnh hưởng.
              </p>
            )}
          </section>
          <div className="grid gap-5 xl:grid-cols-2">
            <TrafficTable
              title="Nguồn / phương tiện (top 100)"
              rows={report.sources}
            />
            <TrafficTable
              title="Trang đích (top 100)"
              rows={report.landing_pages}
              landing
            />
          </div>
          <TrafficTable title="Thiết bị" rows={report.devices} />
          <section className={panelClass}>
            <h2 className="font-semibold">Phễu mua hàng tuần tự</h2>
            <p className="mt-2 text-xs leading-6 text-[#6b7867]">
              GA4 đếm người dùng đi theo thứ tự ghé thăm → xem sản phẩm → thêm
              giỏ → bắt đầu thanh toán → mua hàng thành công. Chỉ đơn đã giao và
              đã thanh toán mới phát sự kiện purchase; gửi đơn và mở biên nhận
              không tính là mua thành công. Phễu theo ngày sự kiện, có thể khác
              nhóm đơn được tạo trong kỳ của sổ đơn hàng.
            </p>
            {report.funnel ? (
              <ol className="mt-5 space-y-3">
                {report.funnel.map((step) => (
                  <li key={step.name} className="rounded-xl bg-[#eef3e7] p-4">
                    <p className="text-xs text-[#6b7867]">
                      {eventLabels[step.name.replace(/^\d+\.\s*/, "")] ||
                        step.name}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {count(step.users)}
                    </p>
                    <div className="mt-3 h-3 rounded-full bg-[#dce4d3]">
                      <div
                        className="h-full rounded-full bg-[#739254]"
                        style={{
                          width: `${Math.min(100, report.funnel?.[0]?.users ? (step.users / report.funnel[0].users) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#6b7867]">
                      {report.funnel?.[0]?.users
                        ? percent(step.users / report.funnel[0].users)
                        : "Không có lượt ghé thăm"}{" "}
                      của lượt ghé thăm · {percent(step.completion_rate)} hoàn
                      thành bước · {count(step.abandonments)} rời phễu
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-[#6b7867]">
                {report.funnel_error}
              </p>
            )}
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-medium">
                Số lần ghi nhận từng sự kiện
              </summary>
              <p className="mt-3 text-xs text-[#6b7867]">
                Các sự kiện riêng có thể lặp lại; không dùng số lần sự kiện làm
                tỷ lệ chuyển đổi.
              </p>
              <dl className="mt-3 space-y-2">
                {report.events.map((event) => (
                  <div
                    key={event.name}
                    className="flex flex-wrap justify-between gap-3 border-b border-[#edf0e7] py-2 text-sm"
                  >
                    <dt>{eventLabels[event.name] || event.name}</dt>
                    <dd>
                      {count(event.count)} lần · {count(event.users)} người dùng
                    </dd>
                  </div>
                ))}
              </dl>
              {!report.events.length && (
                <p className="mt-3 text-sm text-[#6b7867]">
                  Chưa ghi nhận các sự kiện mua hàng trong kỳ.
                </p>
              )}
            </details>
          </section>
          <p className="text-xs leading-6 text-[#6b7867]">
            Cập nhật:{" "}
            {new Date(report.fetched_at).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
            . Chỉ phản ánh người dùng đồng ý phân tích và được GA4 ghi nhận.
            {report.truncated
              ? " Bảng chi tiết đã giới hạn số dòng; chỉ số tổng quan vẫn lấy toàn bộ dữ liệu."
              : ""}
            {report.sampled
              ? " Google lấy mẫu một phần dữ liệu cho báo cáo/phễu này."
              : ""}
            {report.thresholded
              ? " Google áp dụng ngưỡng bảo vệ dữ liệu cho báo cáo này."
              : ""}
          </p>
        </>
      )}
    </div>
  );
}
