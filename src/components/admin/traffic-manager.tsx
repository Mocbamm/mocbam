"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Download,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportRange } from "@/lib/store-reports";
import {
  formatDay,
  matchPreset,
  periodPhrase,
  presetRange,
  reportRangeQuery,
  weekdayLabel,
  type ReportPreset,
  type ReportSelection,
} from "@/lib/report-periods";
import {
  biggestFunnelDrop,
  deviceLabel,
  formatDuration,
  funnelStepLabel,
  groupTrafficRows,
  landingPageLabel,
  trafficSourceLabel,
} from "@/lib/traffic-labels";
import {
  trafficCsv,
  type TrafficReport,
  type TrafficRow,
  type TrafficState,
} from "@/lib/traffic-reports";
import { formatPrice } from "@/lib/utils";
import { panelClass } from "./admin-common";
import {
  BarList,
  KpiCard,
  MoreDetails,
  Notice,
  PeriodPicker,
  ReportModules,
  ReportSection,
  SmallStat,
  formatCount,
  formatPercent,
} from "./report-ui";
import { TimeChart } from "./report-time-chart";

const trafficPresets: ReportPreset[] = [
  "today",
  "yesterday",
  "week",
  "month",
  "last30",
  "year",
];
const trafficColor = "#3b6b26";

function share(part: number, whole: number) {
  return whole > 0 ? part / whole : 0;
}

function TrafficTable({
  title,
  rows,
  label,
  landing = false,
}: {
  title: string;
  rows: TrafficRow[];
  label: (name: string) => string;
  landing?: boolean;
}) {
  if (!rows.length)
    return (
      <p className="text-sm text-[#6b7867]">
        Google Analytics chưa ghi nhận dữ liệu trong khoảng thời gian này.
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">{title}</caption>
        <thead className="text-[#6b7867]">
          <tr>
            {[
              title,
              "Người",
              "Lượt truy cập",
              "Lượt xem trang",
              "Rời đi ngay",
              ...(landing ? ["Đơn thành công", "Doanh thu"] : ["Có tương tác"]),
            ].map((heading) => (
              <th key={heading} scope="col" className="py-3 pr-4 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-[#edf0e7]">
              <th scope="row" className="max-w-64 py-2.5 pr-4 font-medium">
                {label(row.name)}
                {label(row.name) !== row.name && (
                  <span className="block font-normal [overflow-wrap:anywhere] text-[#7a8574]">
                    {row.name}
                  </span>
                )}
              </th>
              <td className="pr-4">{formatCount(row.users)}</td>
              <td className="pr-4">{formatCount(row.sessions)}</td>
              <td className="pr-4">{formatCount(row.views)}</td>
              <td className="pr-4">{formatPercent(row.bounce_rate)}</td>
              {landing ? (
                <>
                  <td className="pr-4">
                    {row.successful_orders == null
                      ? "Chưa có dữ liệu"
                      : formatCount(row.successful_orders)}
                  </td>
                  <td className="whitespace-nowrap">
                    {row.revenue == null
                      ? "Chưa có dữ liệu"
                      : formatPrice(row.revenue)}
                  </td>
                </>
              ) : (
                <td>{formatPercent(row.engagement_rate)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrafficSummary({
  report,
  phrase,
}: {
  report: TrafficReport;
  phrase: string;
}) {
  const { metrics } = report;
  const sources = groupTrafficRows(report.sources, trafficSourceLabel).filter(
    (group) => group.label !== "Không xác định",
  );
  const devices = groupTrafficRows(report.devices, deviceLabel);
  const drop = biggestFunnelDrop(report.funnel);
  const points: ReactNode[] = [];
  if (metrics.sessions > 0 && sources[0])
    points.push(
      <>
        Khách đến nhiều nhất từ <strong>{sources[0].label}</strong> (
        {formatPercent(share(sources[0].sessions, metrics.sessions))} lượt truy
        cập)
        {sources[1] ? (
          <>
            , tiếp theo là <strong>{sources[1].label}</strong>
          </>
        ) : null}
        .
      </>,
    );
  if (metrics.sessions > 0 && devices[0])
    points.push(
      <>
        {formatPercent(share(devices[0].sessions, metrics.sessions))} lượt truy
        cập dùng <strong>{devices[0].label.toLowerCase()}</strong>.
      </>,
    );
  if (report.commerce)
    points.push(
      report.commerce.successful_orders > 0 ? (
        <>
          <strong>{formatCount(report.commerce.successful_orders)} đơn</strong>{" "}
          đã giao và thanh toán thành công
          {metrics.sessions > 0 && (
            <>
              {" "}
              — trung bình cứ khoảng{" "}
              <strong>
                {formatCount(
                  Math.round(
                    metrics.sessions / report.commerce.successful_orders,
                  ),
                )}{" "}
                lượt truy cập
              </strong>{" "}
              có 1 đơn
            </>
          )}
          .
        </>
      ) : (
        <>Chưa có đơn nào vừa giao xong vừa thanh toán trong kỳ này.</>
      ),
    );
  if (drop && drop.rate < 1)
    points.push(
      <>
        Nhiều người dừng lại nhất ở bước{" "}
        <strong>
          {drop.from} → {drop.to}
        </strong>
        : chỉ {formatPercent(drop.rate)} đi tiếp.
      </>,
    );
  return (
    <section
      aria-labelledby="traffic-summary-title"
      className={`${panelClass} border-[#cfdcc4] bg-[#f6f9f1]`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2
            id="traffic-summary-title"
            className="text-xs font-semibold tracking-[0.12em] text-[#557a3d] uppercase"
          >
            Tóm tắt
          </h2>
          {metrics.sessions === 0 ? (
            <p className="mt-2 text-lg leading-8 text-[#21372b]">
              {phrase}, Google Analytics chưa ghi nhận lượt truy cập nào.
            </p>
          ) : (
            <p className="mt-2 text-lg leading-8 text-[#21372b]">
              {phrase} có{" "}
              <strong>{formatCount(metrics.totalUsers)} người</strong> ghé
              website qua{" "}
              <strong>{formatCount(metrics.sessions)} lượt truy cập</strong>,
              xem tổng cộng{" "}
              <strong>{formatCount(metrics.screenPageViews)} trang</strong>.
            </p>
          )}
          {points.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm leading-6 text-[#3f4f3c]">
              {points.map((point, index) => (
                <li key={index} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#7f9b6b]"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="shrink-0 rounded-xl border border-[#d9e3d0] bg-white px-4 py-3 md:w-56">
          <p className="flex items-center gap-2 text-xs font-medium text-[#4f5d4b]">
            <span className="relative flex size-2.5" aria-hidden="true">
              {report.realtime && report.realtime.users > 0 && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#7fb35d] opacity-60" />
              )}
              <span className="relative inline-flex size-2.5 rounded-full bg-[#5f8a45]" />
            </span>
            Ngay lúc này
          </p>
          {report.realtime ? (
            <>
              <p className="mt-1 text-2xl font-semibold text-[#21372b]">
                {formatCount(report.realtime.users)}{" "}
                <span className="text-sm font-normal text-[#4f5d4b]">
                  người đang xem
                </span>
              </p>
              <p className="text-xs leading-5 text-[#6b7867]">
                {formatCount(report.realtime.views)} lượt xem trang trong 30
                phút qua (không theo khoảng ngày đã chọn)
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs leading-5 text-[#6b7867]">
              {report.realtime_error ?? "Chưa đọc được số người đang xem."}
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#6b7867]">
        Số liệu từ Google Analytics chỉ tính khách đồng ý cookie thống kê và có
        thể chậm vài giờ, nên thường thấp hơn số khách thật. Số đơn lấy từ sổ
        đơn hàng của cửa hàng.
      </p>
    </section>
  );
}

function Funnel({ report }: { report: TrafficReport }) {
  const first = report.funnel?.[0]?.users ?? 0;
  return (
    <ReportSection
      title="Khách đi đến bước mua hàng như thế nào?"
      question="Trong số người ghé website, bao nhiêu người xem sản phẩm, thêm vào giỏ, bắt đầu thanh toán và mua thành công."
    >
      {!report.purchase_tracking_configured && (
        <div className="mt-4">
          <Notice
            tone="warning"
            role="status"
            title="Bước “Mua thành công” chưa được ghi nhận"
          >
            Website chưa bật gửi đơn thành công sang Google Analytics, nên bước
            cuối có thể bằng 0. Đây là việc cấu hình của kỹ thuật viên; số đơn
            thật vẫn đúng ở Báo cáo tài chính.
          </Notice>
        </div>
      )}
      {report.funnel ? (
        <ol className="mt-5 space-y-1">
          {report.funnel.map((step, index) => {
            const next = report.funnel?.[index + 1];
            return (
              <li key={step.name}>
                <div className="grid grid-cols-[2rem_1fr] items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-8 items-center justify-center rounded-full bg-[#e3ecda] text-sm font-semibold text-[#2f4f2c]"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="font-medium text-[#21372b]">
                        {funnelStepLabel(step.name)}
                      </span>
                      <span>
                        <strong className="text-base font-semibold">
                          {formatCount(step.users)}
                        </strong>{" "}
                        người
                        <span className="ml-2 text-xs text-[#6b7867]">
                          {first
                            ? `${formatPercent(step.users / first)} người ghé thăm`
                            : "Không có lượt ghé thăm"}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-3 rounded-full bg-[#edf1e7]">
                      <div
                        className="h-full rounded-full bg-[#5f8a45]"
                        style={{
                          width: `${Math.min(100, first ? (step.users / first) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                {next && (
                  <p className="ml-11 py-2 text-xs text-[#6b7867]">
                    ↓ {formatPercent(step.completion_rate)} đi tiếp ·{" "}
                    {formatCount(step.abandonments)} người dừng ở bước này
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-[#6b7867]">{report.funnel_error}</p>
      )}
      <MoreDetails className="mt-5" summary="Số lần ghi nhận từng hành động">
        <p className="text-xs leading-5 text-[#6b7867]">
          Một người có thể làm một hành động nhiều lần, nên các số này không
          dùng để tính tỷ lệ. Phễu ở trên đếm người theo đúng thứ tự các bước,
          theo ngày diễn ra hành động. Chỉ đơn đã giao và đã thanh toán mới tính
          là “Mua thành công”; gửi đơn hoặc mở biên nhận thì chưa.
        </p>
        <dl className="mt-3">
          {report.events.map((event) => (
            <div
              key={event.name}
              className="flex flex-wrap justify-between gap-3 border-b border-[#edf0e7] py-2 text-sm last:border-0"
            >
              <dt>{funnelStepLabel(event.name)}</dt>
              <dd className="tabular-nums">
                {formatCount(event.count)} lần · {formatCount(event.users)}{" "}
                người
              </dd>
            </div>
          ))}
        </dl>
        {!report.events.length && (
          <p className="mt-3 text-sm text-[#6b7867]">
            Chưa ghi nhận hành động mua hàng nào trong kỳ.
          </p>
        )}
      </MoreDetails>
    </ReportSection>
  );
}

function UserTrend({ report }: { report: TrafficReport }) {
  const points = report.trend;
  return (
    <ReportSection
      title="Mỗi ngày có bao nhiêu người ghé website?"
      question="Rê chuột hoặc chạm vào biểu đồ để xem từng ngày."
    >
      {report.trend_error ? (
        <p className="mt-4 text-sm text-[#6b7867]">{report.trend_error}</p>
      ) : !points.length ? (
        <p className="mt-4 text-sm text-[#6b7867]">
          Google Analytics chưa ghi nhận người ghé thăm trong kỳ.
        </p>
      ) : (
        <>
          <TimeChart
            title="Số người ghé website theo ngày"
            description={`Từ ${formatDay(points[0].date)} đến ${formatDay(points.at(-1)!.date)}; cao nhất ${formatCount(Math.max(...points.map((point) => point.users)))} người một ngày. Bảng số liệu ở bên dưới.`}
            axisLabels={points.map((point) => formatDay(point.date, false))}
            series={[
              {
                key: "users",
                label: "Người ghé thăm",
                color: trafficColor,
                kind: "area",
                values: points.map((point) => point.users),
              },
            ]}
            axisFormat={formatCount}
            integer
            unit="người"
            pointTitle={(index) =>
              `${formatDay(points[index].date)}: ${formatCount(points[index].users)} người, ${formatCount(points[index].sessions)} lượt truy cập`
            }
            readout={(index) => {
              const point = points[index];
              return (
                <>
                  <p className="text-xs font-medium text-[#6b7867]">
                    {weekdayLabel(point.date)}, {formatDay(point.date)}
                  </p>
                  <p className="flex flex-wrap gap-x-4 text-[#21372b]">
                    <span>
                      <strong className="font-semibold">
                        {formatCount(point.users)}
                      </strong>{" "}
                      người
                    </span>
                    <span className="text-[#4f5d4b]">
                      {formatCount(point.sessions)} lượt truy cập
                    </span>
                    <span className="text-[#4f5d4b]">
                      {formatCount(point.views)} lượt xem trang
                    </span>
                  </p>
                </>
              );
            }}
          />
          <MoreDetails className="mt-4" summary="Xem bảng số liệu theo ngày">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="text-[#6b7867]">
                  <tr>
                    {["Ngày", "Người", "Lượt truy cập", "Lượt xem trang"].map(
                      (label) => (
                        <th
                          key={label}
                          scope="col"
                          className="py-2 font-medium"
                        >
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.date} className="border-t border-[#edf0e7]">
                      <th scope="row" className="py-2 font-medium">
                        {formatDay(point.date)}
                      </th>
                      <td>{formatCount(point.users)}</td>
                      <td>{formatCount(point.sessions)}</td>
                      <td>{formatCount(point.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MoreDetails>
        </>
      )}
    </ReportSection>
  );
}

function Sources({ report }: { report: TrafficReport }) {
  const groups = groupTrafficRows(report.sources, trafficSourceLabel);
  const top = groups.slice(0, groups.length > 8 ? 7 : 8);
  const rest = groups.slice(top.length);
  const rows = rest.length
    ? [
        ...top,
        {
          label: "Nguồn khác",
          sessions: rest.reduce((sum, group) => sum + group.sessions, 0),
          views: 0,
          names: rest.flatMap((group) => group.names),
        },
      ]
    : top;
  const total = report.metrics.sessions;
  return (
    <ReportSection
      title="Khách đến từ đâu?"
      question="Số lượt truy cập theo nơi khách bấm vào website."
    >
      <div className="mt-4">
        {!rows.length ? (
          <p className="text-sm text-[#6b7867]">
            Google Analytics chưa ghi nhận nguồn truy cập trong kỳ.
          </p>
        ) : (
          <BarList
            valueLabel="Lượt truy cập theo nguồn"
            rows={rows.map((group) => ({
              key: group.label,
              label: group.label,
              sublabel:
                group.label === "Vào thẳng website"
                  ? "Gõ địa chỉ, bấm link đã lưu hoặc link trong tin nhắn"
                  : group.label === "Không xác định"
                    ? "Google Analytics không biết nguồn"
                    : undefined,
              value: group.sessions,
              display: (
                <>
                  <strong className="font-semibold">
                    {formatCount(group.sessions)}
                  </strong>{" "}
                  lượt
                  {total > 0 && (
                    <span className="ml-1.5 text-xs text-[#6b7867]">
                      {formatPercent(group.sessions / total)}
                    </span>
                  )}
                </>
              ),
            }))}
          />
        )}
      </div>
      <MoreDetails className="mt-5" summary="Chi tiết từng nguồn (tối đa 100)">
        <TrafficTable
          title="Nguồn"
          rows={report.sources}
          label={trafficSourceLabel}
        />
      </MoreDetails>
    </ReportSection>
  );
}

function Devices({ report }: { report: TrafficReport }) {
  const groups = groupTrafficRows(report.devices, deviceLabel);
  const total = report.metrics.sessions;
  return (
    <ReportSection
      title="Khách dùng thiết bị gì?"
      question="Giúp bạn biết nên ưu tiên ảnh và bố cục cho điện thoại hay máy tính."
    >
      <div className="mt-4">
        {!groups.length ? (
          <p className="text-sm text-[#6b7867]">
            Google Analytics chưa ghi nhận thiết bị trong kỳ.
          </p>
        ) : (
          <BarList
            valueLabel="Lượt truy cập theo thiết bị"
            rows={groups.map((group) => ({
              key: group.label,
              label: group.label,
              value: group.sessions,
              display: (
                <>
                  <strong className="font-semibold">
                    {formatPercent(share(group.sessions, total))}
                  </strong>
                  <span className="ml-1.5 text-xs text-[#6b7867]">
                    {formatCount(group.sessions)} lượt
                  </span>
                </>
              ),
            }))}
          />
        )}
      </div>
      <MoreDetails className="mt-5" summary="Chi tiết theo thiết bị">
        <TrafficTable
          title="Thiết bị"
          rows={report.devices}
          label={deviceLabel}
        />
      </MoreDetails>
    </ReportSection>
  );
}

function LandingPages({ report }: { report: TrafficReport }) {
  const rows = [...report.landing_pages]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 6);
  return (
    <ReportSection
      title="Khách vào website từ trang nào?"
      question="Trang đầu tiên khách mở, khách có xem tiếp không và trang nào mang về đơn hàng."
    >
      {!rows.length ? (
        <p className="mt-4 text-sm text-[#6b7867]">
          Google Analytics chưa ghi nhận trang đích trong kỳ.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[#edf0e7]">
          {rows.map((row) => {
            const label = landingPageLabel(row.name);
            return (
              <li key={row.name} className="py-3 first:pt-0">
                <p className="text-sm font-medium text-[#21372b]">
                  {label}
                  {label !== row.name && (
                    <span className="ml-2 text-xs font-normal [overflow-wrap:anywhere] text-[#7a8574]">
                      {row.name}
                    </span>
                  )}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-5">
                  <div>
                    <dt className="text-[#6b7867]">Lượt truy cập</dt>
                    <dd className="font-medium tabular-nums">
                      {formatCount(row.sessions)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6b7867]">Lượt xem trang</dt>
                    <dd className="font-medium tabular-nums">
                      {formatCount(row.views)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6b7867]">Rời đi ngay</dt>
                    <dd className="font-medium tabular-nums">
                      {formatPercent(row.bounce_rate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6b7867]">Đơn thành công</dt>
                    <dd className="font-medium tabular-nums">
                      {row.successful_orders == null
                        ? "Chưa có dữ liệu"
                        : formatCount(row.successful_orders)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6b7867]">Doanh thu</dt>
                    <dd className="font-medium tabular-nums">
                      {row.revenue == null
                        ? "Chưa có dữ liệu"
                        : formatPrice(row.revenue)}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
      <MoreDetails
        className="mt-4"
        summary={`Xem tất cả ${report.landing_pages.length} trang đích (tối đa 100)`}
      >
        <TrafficTable
          title="Trang đích"
          rows={report.landing_pages}
          label={landingPageLabel}
          landing
        />
        <p className="mt-3 text-xs leading-5 text-[#6b7867]">
          Doanh thu là tiền hàng sau voucher của đơn đã giao và đã thanh toán,
          không gồm phí giao hàng, gán cho trang khách vào đầu tiên (chỉ khi
          khách đồng ý cookie thống kê). Đơn hủy, trả hàng hoặc hoàn tiền không
          được tính. File CSV có đủ mọi trang có doanh thu.
        </p>
      </MoreDetails>
    </ReportSection>
  );
}

function TechnicalNotes({ report }: { report: TrafficReport }) {
  const commerce = report.commerce;
  return (
    <MoreDetails className="bg-white" summary="Cách tính và ghi chú kỹ thuật">
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#3f4f3c]">
        <li>
          <strong>Người ghé thăm</strong>: số người (thiết bị) khác nhau.{" "}
          <strong>Lượt truy cập</strong> (phiên): mỗi lần mở website; một người
          có thể ghé nhiều lần. <strong>Lượt xem trang</strong>: số trang đã mở.
        </li>
        <li>
          <strong>Rời đi ngay</strong> (tỷ lệ thoát của Google Analytics 4):
          phần trăm lượt truy cập không có tương tác — ở lại dưới 10 giây, chỉ
          xem 1 trang và không thao tác mua hàng. Khác cách tính “chỉ xem một
          trang” của báo cáo cũ.
        </li>
        <li>
          <strong>Tỷ lệ đặt hàng thành công</strong> = số đơn đã giao và đã
          thanh toán được tạo trong khoảng ngày đã chọn (giờ Việt Nam) chia cho
          số lượt truy cập. Sổ đơn hàng gồm cả khách từ chối cookie, còn Google
          Analytics chỉ thấy khách đồng ý, nên tỷ lệ này có thể cao hơn thực tế
          hoặc vượt 100%.
        </li>
        {commerce ? (
          <li>
            {formatCount(commerce.successful_orders)} đơn đã giao và đã thanh
            toán; {formatCount(commerce.attributed_orders)} đơn có lưu trang
            khách vào đầu tiên (khi khách đồng ý cookie thống kê). Trang không
            có nguồn lưu không được gán doanh thu tùy ý.
          </li>
        ) : (
          <li role="status">{report.commerce_error}</li>
        )}
        {Boolean(commerce?.pending_events) && (
          <li>
            {formatCount(commerce!.pending_events)} đơn thành công đang chờ gửi
            sang Google Analytics; hệ thống tự thử lại khi cập nhật đơn hoặc làm
            mới báo cáo.
          </li>
        )}
        {Boolean(commerce?.expired_events) && (
          <li className="text-amber-800">
            {formatCount(commerce!.expired_events)} sự kiện quá giới hạn gửi bù
            72 giờ của Google Analytics. Số liệu sổ đơn hàng vẫn đầy đủ.
          </li>
        )}
        <li>
          Ngày theo múi giờ của Google Analytics ({report.timezone}); số liệu
          theo ngày có độ trễ xử lý của Google. “Ngay lúc này” luôn là 30 phút
          gần nhất.
        </li>
        {report.truncated && (
          <li>
            Bảng chi tiết đã giới hạn số dòng; các con số tổng vẫn lấy toàn bộ
            dữ liệu.
          </li>
        )}
        {report.sampled && (
          <li>Google lấy mẫu một phần dữ liệu cho báo cáo/phễu này.</li>
        )}
        {report.thresholded && (
          <li>Google áp dụng ngưỡng bảo vệ dữ liệu cho báo cáo này.</li>
        )}
      </ul>
    </MoreDetails>
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
  const [selection, setSelection] = useState<ReportSelection>(() =>
    matchPreset(initialRange, new Date(), trafficPresets),
  );
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
  useEffect(() => {
    if (invalidRange) return;
    const query = reportRangeQuery(range);
    if (query && query !== window.location.search)
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query}`,
      );
  }, [invalidRange, range]);
  const current =
    result?.range.from === range.from && result.range.to === range.to
      ? result
      : null;
  // While a new range loads, keep the previous charts (dimmed) instead of
  // blanking the page; every sentence still names that report's own dates.
  const stale = !current && loading && result?.configured ? result : null;
  const report = current?.configured ? current : stale;
  const reportSelection = report
    ? matchPreset(report.range, new Date(), trafficPresets)
    : selection;
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
  return (
    <div className="space-y-5">
      <ReportModules traffic range={invalidRange ? undefined : range} />
      <PeriodPicker
        range={range}
        selection={selection}
        presets={trafficPresets}
        onPreset={(preset) => {
          setSelection(preset);
          setRange(presetRange(new Date(), preset));
        }}
        onCustom={(next) => {
          setSelection("custom");
          setRange(next);
        }}
        actions={
          <>
            <Button
              variant="outline"
              disabled={loading || invalidRange}
              onClick={() => setRevision((value) => value + 1)}
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Đang tải…" : "Làm mới"}
            </Button>
            <Button
              variant="outline"
              disabled={invalidRange || loading}
              onClick={exportCsv}
              title="Tải bảng số liệu; mở được bằng Excel hoặc Google Sheets"
            >
              <Download className="size-4" />
              Tải CSV
            </Button>
            <label className="flex min-h-9 items-center gap-2 px-1 text-xs text-[#4f5d4b]">
              <input
                type="checkbox"
                checked={live}
                onChange={(event) => setLive(event.target.checked)}
                className="size-4 accent-[#294836]"
              />
              Tự làm mới mỗi 30 giây
            </label>
          </>
        }
      />
      {invalidRange && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          Chọn ngày bắt đầu và ngày kết thúc hợp lệ (ngày bắt đầu không sau ngày
          kết thúc).
        </p>
      )}
      {!invalidRange && error && (
        <section role="alert" className={`${panelClass} border-red-200`}>
          <h2 className="font-semibold text-red-800">
            Chưa tải được số liệu lưu lượng
          </h2>
          <p className="mt-2 text-sm leading-6 text-red-800">
            {error}
            {current?.configured
              ? " Đang hiển thị lần tải thành công gần nhất."
              : ""}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#4f5d4b]">
            Thường chỉ là lỗi tạm thời của Google. Hãy thử lại sau ít phút; nếu
            vẫn lỗi, nhờ kỹ thuật viên kiểm tra kết nối Google Analytics.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw className="size-4" />
            Thử lại
          </Button>
        </section>
      )}
      {!invalidRange && !error && loading && !report && (
        <div
          role="status"
          className={`${panelClass} flex items-center gap-3 text-sm text-[#4f5d4b]`}
        >
          <LoaderCircle className="size-5 animate-spin text-[#557a3d]" />
          Đang tải số liệu từ Google Analytics…
        </div>
      )}
      {!invalidRange && current && !current.configured && (
        <section className={`${panelClass} border-dashed`}>
          <h2 className="text-lg font-semibold">
            Chưa kết nối Google Analytics
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#4f5d4b]">
            Khi được kết nối, trang này sẽ cho bạn biết có bao nhiêu người ghé
            website mỗi ngày, họ đến từ đâu (Facebook, Google, Zalo…), xem trang
            nào và bao nhiêu người đi đến bước đặt hàng. Website vẫn bán hàng
            bình thường trong lúc chờ.
          </p>
          <div className="mt-4 max-w-3xl">
            <Notice title="Việc cần làm">
              Nhờ người phụ trách kỹ thuật kết nối quyền <em>đọc báo cáo</em>{" "}
              Google Analytics cho trang quản trị (chi tiết bên dưới). Bạn không
              cần nhập gì ở đây.
            </Notice>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/admin/analytics${reportRangeQuery(range)}`}>
                Xem doanh thu ở Báo cáo tài chính
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://analytics.google.com/"
                target="_blank"
                rel="noreferrer"
              >
                Mở Google Analytics
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>
          <MoreDetails
            className="mt-5 max-w-3xl"
            summary="Thông tin cho kỹ thuật viên"
          >
            <p className="text-sm leading-6 text-[#4f5d4b]">{current.reason}</p>
            <p className="mt-2 text-xs leading-5 text-[#6b7867]">
              Hướng dẫn: docs/TRAFFIC-ANALYTICS.md. Cần GA_PROPERTY_ID và tài
              khoản dịch vụ (GA_SERVICE_ACCOUNT_EMAIL,
              GA_SERVICE_ACCOUNT_PRIVATE_KEY) có quyền Viewer trên máy chủ. File
              CSV lúc này chỉ ghi trạng thái kết nối, không điền số liệu giả.
            </p>
          </MoreDetails>
        </section>
      )}
      {!invalidRange && report && (
        <div
          aria-busy={Boolean(stale)}
          className={`space-y-5 transition-opacity ${stale ? "opacity-55" : ""}`}
        >
          {stale && (
            <p role="status" className="text-sm text-[#4f5d4b]">
              Đang tải số liệu cho khoảng thời gian mới…
            </p>
          )}
          <TrafficSummary
            report={report}
            phrase={periodPhrase(reportSelection, report.range)}
          />
          {Boolean(report.commerce?.uncertain_events) && (
            <Notice
              tone="warning"
              role="status"
              title="Cần kỹ thuật viên kiểm tra"
            >
              {formatCount(report.commerce!.uncertain_events)} lần hoàn tiền
              chưa rõ Google Analytics đã nhận hay chưa. Cần đối soát trên
              Google Analytics trước khi gửi lại để tránh trừ doanh thu hai lần.
              Báo cáo tài chính không bị ảnh hưởng.
            </Notice>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Người ghé thăm"
              value={formatCount(report.metrics.totalUsers)}
              hint="Số người khác nhau đã vào website (mỗi điện thoại hoặc máy tính tính là 1)."
            />
            <KpiCard
              label="Lượt truy cập"
              value={formatCount(report.metrics.sessions)}
              hint="Mỗi lần mở website là 1 lượt; một người có thể ghé nhiều lần."
            />
            <KpiCard
              label="Lượt xem trang"
              value={formatCount(report.metrics.screenPageViews)}
              hint="Tổng số trang khách đã mở, gồm trang sản phẩm, giỏ hàng, bài viết…"
            />
            <KpiCard
              label="Tỷ lệ đặt hàng thành công"
              value={
                report.successful_order_conversion_rate == null
                  ? "Chưa có dữ liệu"
                  : formatPercent(report.successful_order_conversion_rate)
              }
              muted={report.successful_order_conversion_rate == null}
              hint={
                report.commerce
                  ? `${formatCount(report.commerce.successful_orders)} đơn đã giao & thanh toán trên ${formatCount(report.metrics.sessions)} lượt truy cập.`
                  : "Chưa đọc được sổ đơn hàng; xem ghi chú kỹ thuật bên dưới."
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SmallStat
              label="Thời gian xem trung bình"
              value={formatDuration(report.metrics.averageSessionDuration)}
              hint="Mỗi lượt truy cập"
            />
            <SmallStat
              label="Số trang mỗi lượt"
              value={
                report.pages_per_session == null
                  ? "Chưa có lượt truy cập"
                  : formatCount(report.pages_per_session)
              }
              hint="Càng cao, khách càng xem nhiều"
            />
            <SmallStat
              label="Rời đi ngay"
              value={formatPercent(report.metrics.bounceRate)}
              hint="Không tương tác gì; càng thấp càng tốt"
            />
            <SmallStat
              label="Lượt có tương tác"
              value={`${formatCount(report.metrics.engagedSessions)} (${formatPercent(report.metrics.engagementRate)})`}
              hint={`Ở lại trên 10 giây hoặc xem từ 2 trang · ${formatCount(report.metrics.activeUsers)} người hoạt động`}
            />
          </div>
          <Funnel report={report} />
          <UserTrend report={report} />
          <div className="grid gap-5 lg:grid-cols-2">
            <Sources report={report} />
            <Devices report={report} />
          </div>
          <LandingPages report={report} />
          <TechnicalNotes report={report} />
          <p className="text-xs leading-6 text-[#6b7867]">
            Cập nhật lúc{" "}
            {new Date(report.fetched_at).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
            . Chỉ phản ánh người dùng đồng ý phân tích và được Google Analytics
            ghi nhận.
          </p>
        </div>
      )}
    </div>
  );
}
