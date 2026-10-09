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
  view_item: "Xem sản phẩm",
  add_to_cart: "Thêm vào giỏ",
  begin_checkout: "Bắt đầu thanh toán",
  order_submitted: "Gửi đơn hàng",
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
function TrafficTable({ title, rows }: { title: string; rows: TrafficRow[] }) {
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
                {[title, "Người dùng", "Phiên", "Lượt xem", "Tương tác"].map(
                  (label) => (
                    <th key={label} className="py-3 pr-4 font-medium">
                      {label}
                    </th>
                  ),
                )}
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
                  <td>{percent(row.engagement_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <div className="grid gap-5 xl:grid-cols-2">
            <TrafficTable
              title="Nguồn / phương tiện (top 100)"
              rows={report.sources}
            />
            <TrafficTable
              title="Trang đích (top 100)"
              rows={report.landing_pages}
            />
          </div>
          <TrafficTable title="Thiết bị" rows={report.devices} />
          <section className={panelClass}>
            <h2 className="font-semibold">Phễu mua hàng tuần tự</h2>
            <p className="mt-2 text-xs leading-6 text-[#6b7867]">
              GA4 đếm người dùng đi theo thứ tự xem sản phẩm → thêm giỏ → bắt
              đầu thanh toán → gửi đơn. Gửi đơn chưa đồng nghĩa với thanh toán
              thành công.
            </p>
            {report.funnel ? (
              <ol className="mt-5 grid gap-3 md:grid-cols-4">
                {report.funnel.map((step) => (
                  <li key={step.name} className="rounded-xl bg-[#eef3e7] p-4">
                    <p className="text-xs text-[#6b7867]">
                      {eventLabels[step.name.replace(/^\d+\.\s*/, "")] ||
                        step.name}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {count(step.users)}
                    </p>
                    <p className="mt-2 text-xs text-[#6b7867]">
                      {percent(step.completion_rate)} hoàn thành bước ·{" "}
                      {count(step.abandonments)} rời phễu
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
