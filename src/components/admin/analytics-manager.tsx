"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildStoreReport,
  reportCsv,
  reportPeriodRange,
  reportTrend,
  type ReportGrouping,
  type ReportOrder,
  type ReportRange,
  type ReportPeriod,
} from "@/lib/store-reports";
import { formatPrice } from "@/lib/utils";
import {
  FinanceTrendChart,
  PaymentShareChart,
  financePaymentLabels,
  trendPeriodLabel,
} from "./finance-report-charts";
import {
  EmptyState,
  fieldClass,
  orderLabels,
  panelClass,
} from "./admin-common";

const periods: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "year", label: "Năm nay" },
];
const groupingLabels = { day: "ngày", week: "tuần", month: "tháng" };

export function ReportModules({ traffic = false }: { traffic?: boolean }) {
  return (
    <nav aria-label="Loại báo cáo" className="mb-6 flex flex-wrap gap-2">
      <Link
        href="/admin/analytics"
        aria-current={!traffic ? "page" : undefined}
        className={`rounded-xl px-4 py-3 text-sm font-medium ${!traffic ? "bg-[#294836] text-white" : "border border-[#dce3d7] bg-white"}`}
      >
        Báo cáo tài chính
      </Link>
      <Link
        href="/admin/analytics/traffic"
        aria-current={traffic ? "page" : undefined}
        className={`rounded-xl px-4 py-3 text-sm font-medium ${traffic ? "bg-[#294836] text-white" : "border border-[#dce3d7] bg-white"}`}
      >
        Lưu lượng website
      </Link>
    </nav>
  );
}

export function AnalyticsManager({
  orders,
  initialRange,
}: {
  orders: ReportOrder[];
  initialRange: ReportRange;
}) {
  const router = useRouter();
  const [range, setRange] = useState(initialRange);
  const [live, setLive] = useState(false);
  const [productRank, setProductRank] = useState<"quantity" | "profit">(
    "quantity",
  );
  const [pending, startTransition] = useTransition();
  const [chart, setChart] = useState<"revenue" | "orders">("revenue");
  const [grouping, setGrouping] = useState<ReportGrouping>("day");
  const invalidRange = Boolean(range.from && range.to && range.from > range.to);
  const report = useMemo(
    () => buildStoreReport(orders, range),
    [orders, range],
  );
  const trend = useMemo(
    () => reportTrend(report, grouping, range),
    [report, grouping, range],
  );
  useEffect(() => {
    if (!live) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible")
        startTransition(() => router.refresh());
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [live, router]);
  const rankedProducts = useMemo(
    () =>
      [...report.products].sort((a, b) =>
        productRank === "profit"
          ? (b.gross_profit ?? -Infinity) - (a.gross_profit ?? -Infinity) ||
            b.quantity - a.quantity
          : b.quantity - a.quantity,
      ),
    [report.products, productRank],
  );
  const maxValue = Math.max(1, ...trend.map((row) => row.order_count));
  function exportReport() {
    const url = URL.createObjectURL(
      new Blob([reportCsv(report, grouping, range)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `moc-bam-tai-chinh-${range.from || "bat-dau"}-${range.to || "hien-tai"}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
  const costValue = (value: number | null) =>
    value === null ? "Chưa đủ giá vốn" : formatPrice(value);
  const metrics = [
    {
      label: "Tổng giá trị sản phẩm (GMV)",
      value: formatPrice(report.gross_sales),
      note: "Trước giảm giá, hủy và hoàn; không gồm vận chuyển",
    },
    {
      label: "Doanh thu sản phẩm thuần",
      value: formatPrice(report.net_sales),
      note: "GMV trừ giảm giá, đơn hủy/trả hàng và sản phẩm hoàn tiền",
    },
    {
      label: "Giá vốn sản phẩm",
      value: costValue(report.cogs),
      note: `${report.cost_order_count - report.missing_cost_order_count}/${report.cost_order_count} đơn có đủ giá vốn lúc đặt; gồm hàng hoàn không nhập kho`,
    },
    {
      label: "Lợi nhuận gộp dự kiến",
      value: costValue(report.gross_profit),
      note: "Doanh thu sản phẩm thuần trừ giá vốn; gồm đơn chưa hoàn tất",
    },
    {
      label: "Phí giao hàng trên đơn còn hiệu lực",
      value: formatPrice(report.shipping_charged),
      note: "Tách khỏi doanh thu sản phẩm; chưa trừ phí trả đơn vị vận chuyển",
    },
    {
      label: "Chi phí hàng hoàn không nhập kho",
      value: costValue(report.damaged_return_cost),
      note: "Đã nằm trong giá vốn; không trừ lần thứ hai",
    },
    {
      label: "Tỷ lệ hủy / hoàn tất đã thanh toán",
      value: `${report.order_count ? ((report.cancelled_order_count / report.order_count) * 100).toFixed(1) : 0}% / ${report.order_count ? ((report.successful_order_count / report.order_count) * 100).toFixed(1) : 0}%`,
      note: "Trên tổng số đơn đặt trong kỳ",
    },
    {
      label: "Đơn được đặt",
      value: report.order_count,
      note: `${report.cancelled_order_count} hủy · ${report.returned_order_count} trả hàng · ${report.successful_order_count} hoàn tất đã thanh toán`,
    },
    {
      label: "Đơn đã hoàn tiền",
      value: report.refunded_order_count,
      note: "Đơn đặt trong kỳ; có thể gồm đơn đã trả hàng",
    },
    {
      label: "AOV đơn hoàn tất",
      value: formatPrice(report.completed_average_order_value),
      note: "Đơn hoàn tất đã thanh toán; không gồm phí giao hàng",
    },
    {
      label: "Giảm giá đã áp dụng",
      value: formatPrice(report.discounts),
      note: "Tổng giảm giá trên đơn chưa hủy/trả hàng",
    },
    {
      label: "Giá trị sản phẩm đã hủy",
      value: formatPrice(report.cancelled_sales),
      note: "Giá trị sản phẩm trước giảm giá trong đơn hủy",
    },
    {
      label: "Giá trị sản phẩm trả hàng",
      value: formatPrice(report.returned_sales),
      note: "Trước giảm giá; không tính trùng vào doanh thu thuần",
    },
    {
      label: "Giá trị sản phẩm đã hoàn tiền khác",
      value: formatPrice(report.refunded_sales),
      note: "Sau giảm giá; đơn trong kỳ đã hoàn tiền",
    },
    {
      label: "Chờ ghi nhận thanh toán",
      value: formatPrice(report.awaiting_payment_value),
      note: "Đơn chưa hủy/trả hàng trong kỳ; gồm phí giao hàng",
    },
    {
      label: "Tiền đã xác nhận trong kỳ",
      value: formatPrice(report.collected),
      note: "Theo ngày xác nhận thanh toán; gồm phí giao hàng",
    },
    {
      label: "Tiền đã hoàn trong kỳ",
      value: formatPrice(report.refunded),
      note: "Theo ngày ghi nhận hoàn tiền; gồm phí giao hàng",
    },
    {
      label: "Thu ròng trong kỳ",
      value: formatPrice(report.net_collected),
      note: "Tiền xác nhận trừ tiền hoàn; không phải lợi nhuận",
    },
  ];
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
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
            {pending ? "Đang cập nhật…" : "Cập nhật"}
          </Button>
          <Button
            variant="outline"
            onClick={exportReport}
            disabled={invalidRange}
          >
            <Download className="size-4" />
            Xuất CSV
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {periods.map((period) => (
            <Button
              key={period.value}
              size="sm"
              variant="outline"
              onClick={() =>
                setRange(reportPeriodRange(new Date(), period.value))
              }
            >
              {period.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRange({ from: "", to: "" })}
          >
            Tất cả
          </Button>
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
          Ngày theo múi giờ Việt Nam. Doanh thu tính theo ngày đặt đơn và trạng
          thái hiện tại. Dòng tiền tính theo ngày ghi nhận thu/hoàn, kể cả đơn
          đặt trước kỳ. CSV vẫn xuất được khi kỳ chưa có dữ liệu.
        </p>
      </div>
      {invalidRange ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Ngày bắt đầu phải trước hoặc cùng ngày kết thúc.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className={panelClass}>
                <p className="text-xs text-[#6b7867]">{metric.label}</p>
                <p className="mt-3 break-words text-2xl font-semibold tracking-tight">
                  {metric.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#788273]">
                  {metric.note}
                </p>
              </div>
            ))}
          </div>
          {report.daily.length === 0 ? (
            <EmptyState>
              Chưa có đơn hàng hoặc ghi nhận thanh toán trong khoảng ngày này.
              Các chỉ số bằng 0 và vẫn có thể xuất báo cáo.
            </EmptyState>
          ) : (
            <div className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Biểu đồ xu hướng</h2>
                <div className="flex flex-wrap gap-3">
                  <label className="text-xs">
                    Chỉ số
                    <select
                      className={`${fieldClass} ml-2 w-auto`}
                      value={chart}
                      onChange={(event) =>
                        setChart(event.target.value as typeof chart)
                      }
                    >
                      <option value="revenue">
                        Doanh thu thuần & lợi nhuận gộp
                      </option>
                      <option value="orders">Số đơn</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    Nhóm theo
                    <select
                      className={`${fieldClass} ml-2 w-auto`}
                      value={grouping}
                      onChange={(event) =>
                        setGrouping(event.target.value as ReportGrouping)
                      }
                    >
                      <option value="day">Ngày</option>
                      <option value="week">Tuần</option>
                      <option value="month">Tháng</option>
                    </select>
                  </label>
                </div>
              </div>
              <p className="mt-2 text-xs text-[#6b7867]">
                {chart === "revenue"
                  ? "Xanh: doanh thu sản phẩm thuần · Nâu: lợi nhuận gộp dự kiến. Thiếu giá vốn sẽ ngắt đường lợi nhuận."
                  : "Tất cả đơn đặt trong kỳ, gồm đơn đã hủy"}
              </p>
              <p className="mt-1 text-xs leading-6 text-[#6b7867]">
                Tuần bắt đầu thứ Hai; tháng theo lịch Việt Nam. Kỳ đầu/cuối chỉ
                gồm ngày trong khoảng đã chọn. Bảng và CSV dùng cùng cách nhóm.
              </p>
              {chart === "revenue" ? (
                <FinanceTrendChart rows={trend} grouping={grouping} />
              ) : (
                <div className="mt-6 overflow-x-auto pb-2">
                  <div
                    role="img"
                    aria-label={`Biểu đồ số đơn theo ${groupingLabels[grouping]}; bảng dữ liệu ở bên dưới.`}
                    className="flex h-48 min-w-max items-end gap-2 border-b border-[#dfe5d8]"
                  >
                    {trend.map((row) => (
                      <div
                        key={row.date}
                        title={`${trendPeriodLabel(row, grouping)}: ${row.order_count} đơn`}
                        className="flex h-full w-12 shrink-0 flex-col justify-end gap-2"
                      >
                        <div className="flex h-36 items-end justify-center gap-1">
                          <div
                            className="w-4 rounded-t bg-[#426533]"
                            style={{
                              height: `${(row.order_count / maxValue) * 140}px`,
                            }}
                          />
                        </div>
                        <span className="mb-2 text-center text-[10px] text-[#6b7867]">
                          {grouping === "month"
                            ? row.date.slice(0, 7)
                            : row.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <details className="mt-5">
                <summary className="cursor-pointer text-sm font-medium">
                  Xem bảng dữ liệu theo {groupingLabels[grouping]}
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full whitespace-nowrap text-left text-xs">
                    <caption className="sr-only">
                      Doanh thu, đơn hàng và dòng tiền theo{" "}
                      {groupingLabels[grouping]} Việt Nam
                    </caption>
                    <thead className="border-b border-[#edf0e7] text-[#6b7867]">
                      <tr>
                        {[
                          grouping === "week"
                            ? "Tuần (thứ Hai – Chủ nhật)"
                            : grouping === "month"
                              ? "Tháng"
                              : "Ngày",
                          "Số đơn",
                          "GMV",
                          "Doanh thu thuần",
                          "Tiền xác nhận",
                          "Tiền hoàn",
                          "Thu ròng",
                          "Giá vốn",
                          "Lợi nhuận gộp dự kiến",
                        ].map((title) => (
                          <th
                            key={title}
                            scope="col"
                            className="py-3 pr-4 font-medium"
                          >
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map((row) => (
                        <tr
                          key={row.date}
                          className="border-b border-[#edf0e7]"
                        >
                          <th scope="row" className="py-3 pr-4 font-medium">
                            {trendPeriodLabel(row, grouping)}
                          </th>
                          <td className="pr-4">{row.order_count}</td>
                          {[
                            row.gross_sales,
                            row.net_sales,
                            row.collected,
                            row.refunded,
                            row.collected - row.refunded,
                          ].map((value, index) => (
                            <td key={index} className="pr-4">
                              {formatPrice(value)}
                            </td>
                          ))}
                          <td className="pr-4">{costValue(row.cogs)}</td>
                          <td className="pr-4">
                            {costValue(row.gross_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
          <div className={panelClass}>
            <h2 className="font-semibold">Phương thức thanh toán</h2>
            <p className="mt-2 text-xs leading-6 text-[#6b7867]">
              Biểu đồ phân bổ doanh thu sản phẩm thuần theo ngày đặt đơn, gồm
              đơn chưa hoàn tất và chưa gồm phí giao hàng. Tiền xác nhận/hoàn
              bên dưới theo ngày thực thu/hoàn trong kỳ.
            </p>
            <PaymentShareChart report={report} />
            {report.payment_breakdown.length === 0 ? (
              <p className="mt-4 text-sm text-[#6b7867]">
                Chưa có giao dịch trong kỳ.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="text-xs text-[#6b7867]">
                    <tr>
                      {[
                        "Phương thức",
                        "Số đơn",
                        "Doanh thu thuần",
                        "Đã xác nhận",
                        "Đã hoàn",
                        "Chờ thanh toán",
                      ].map((label) => (
                        <th key={label} className="py-3 pr-5 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.payment_breakdown.map((row) => (
                      <tr
                        key={row.method}
                        className="border-t border-[#edf0e7]"
                      >
                        <th className="py-3 pr-5 font-medium">
                          {financePaymentLabels[row.method]}
                        </th>
                        <td className="pr-5">{row.order_count}</td>
                        <td className="pr-5">{formatPrice(row.net_sales)}</td>
                        <td className="pr-5">{formatPrice(row.collected)}</td>
                        <td className="pr-5">{formatPrice(row.refunded)}</td>
                        <td>{formatPrice(row.awaiting)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className={panelClass}>
              <h2 className="font-semibold">Trạng thái đơn trong kỳ</h2>
              <dl className="mt-5 space-y-3">
                {Object.entries(report.status_counts).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between border-b border-[#edf0e7] pb-3 last:border-0"
                  >
                    <dt className="text-sm text-[#6b7867]">
                      {orderLabels[status as keyof typeof orderLabels]}
                    </dt>
                    <dd className="font-semibold">{count}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Sản phẩm bán chạy</h2>
                <label className="text-xs">
                  Xếp theo{" "}
                  <select
                    className={`${fieldClass} w-auto`}
                    value={productRank}
                    onChange={(event) =>
                      setProductRank(event.target.value as typeof productRank)
                    }
                  >
                    <option value="quantity">Số lượng</option>
                    <option value="profit">Lợi nhuận gộp</option>
                  </select>
                </label>
              </div>
              <p className="mt-1 text-xs leading-6 text-[#6b7867]">
                Số lượng và doanh thu chỉ tính đơn chưa hủy/hoàn tiền. Lợi nhuận
                trừ giá vốn lúc đặt, gồm chi phí hàng hoàn không nhập kho; sản
                phẩm chỉ có hàng hoàn có thể có số lượng 0 và lợi nhuận âm.
              </p>
              {report.products.length === 0 ? (
                <p className="mt-5 text-sm text-[#6b7867]">
                  Chưa có sản phẩm trong khoảng ngày này.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {rankedProducts.slice(0, 10).map((product, index) => (
                    <li
                      key={product.id}
                      className="flex items-start justify-between gap-3 border-b border-[#edf0e7] pb-3 text-sm last:border-0"
                    >
                      <span className="flex min-w-0 gap-2">
                        <span className="text-[#788273]">{index + 1}.</span>
                        {product.name}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-semibold">
                          {product.quantity} sản phẩm
                        </span>
                        <span className="mt-1 block text-xs text-[#6b7867]">
                          Doanh thu:{" "}
                          {product.net_value === null
                            ? "Thiếu phân bổ ưu đãi"
                            : formatPrice(product.net_value)}
                        </span>
                        <span className="mt-1 block text-xs text-[#6b7867]">
                          Lợi nhuận gộp: {costValue(product.gross_profit)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <div className={`${panelClass} border-dashed`}>
            <h2 className="font-semibold">Giá vốn và lợi nhuận</h2>
            <p className="mt-2 text-sm leading-6 text-[#6b7867]">
              Giá vốn được lưu theo từng sản phẩm khi đặt đơn, không đổi khi sửa
              giá vốn trong danh mục. Đơn cũ hoặc sản phẩm chưa nhập giá vốn
              được ghi là chưa đủ dữ liệu, không coi là 0. Hàng trả lại còn bán
              được chỉ hoàn giá vốn khi được nhập lại kho; hàng hỏng vẫn tính
              chi phí. Lợi nhuận gộp dự kiến gồm đơn chưa hoàn tất và chưa trừ
              chi phí vận hành, giao hàng thực tế hoặc quảng cáo. Thu ròng phản
              ánh tiền đã thu trừ tiền hoàn; chưa thể tính lợi nhuận ròng hoặc
              ROAS khi thiếu các chi phí này.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
