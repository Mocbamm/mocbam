"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildStoreReport,
  reportCsv,
  reportTrend,
  storeDate,
  type ReportGrouping,
  type ReportOrder,
  type ReportRange,
  type StoreReport,
} from "@/lib/store-reports";
import {
  comparisonLabel,
  comparisonRange,
  formatRange,
  matchPreset,
  percentChange,
  periodPhrase,
  presetRange,
  reportRangeQuery,
  suggestedGrouping,
  type ReportPreset,
  type ReportSelection,
} from "@/lib/report-periods";
import { formatPrice } from "@/lib/utils";
import {
  FinanceTrendChart,
  PaymentShareChart,
  financePaymentLabels,
  trendPeriodLabel,
} from "./finance-report-charts";
import { orderLabels, panelClass } from "./admin-common";
import {
  BarList,
  DeltaBadge,
  KpiCard,
  MoreDetails,
  Notice,
  PeriodPicker,
  ReportModules,
  ReportSection,
  Segmented,
  SmallStat,
  formatPercent,
} from "./report-ui";

export { ReportModules };

const financePresets: ReportPreset[] = [
  "today",
  "yesterday",
  "week",
  "month",
  "last30",
  "year",
  "all",
];
const groupingOptions: { value: ReportGrouping; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
];
const groupingNames = { day: "ngày", week: "tuần", month: "tháng" };

function costValue(value: number | null) {
  return value === null ? "Chưa đủ giá vốn" : formatPrice(value);
}
function rate(part: number, whole: number) {
  return whole ? part / whole : 0;
}

function FinanceSummary({
  report,
  previous,
  selection,
  range,
  compareRange,
  hasAnyOrders,
}: {
  report: StoreReport;
  previous: StoreReport | null;
  selection: ReportSelection;
  range: ReportRange;
  compareRange: ReportRange | null;
  hasAnyOrders: boolean;
}) {
  const phrase = periodPhrase(selection, range);
  const change = previous
    ? percentChange(report.net_sales, previous.net_sales)
    : null;
  const missingCost = report.missing_cost_order_count;
  const points: ReactNode[] = [];
  if (previous && compareRange && (report.net_sales || previous.net_sales)) {
    const when = `${comparisonLabel(selection)} (${formatRange(compareRange)})`;
    if (change === null)
      points.push(
        <>Chưa so sánh được với {when} vì kỳ đó chưa có doanh thu.</>,
      );
    else
      points.push(
        <>
          Doanh thu{" "}
          <strong
            className={
              change > 0.0005
                ? "text-[#2f6a1f]"
                : change < -0.0005
                  ? "text-[#a2402c]"
                  : ""
            }
          >
            {change > 0.0005
              ? `tăng ${formatPercent(change)}`
              : change < -0.0005
                ? `giảm ${formatPercent(Math.abs(change))}`
                : "không đổi"}
          </strong>{" "}
          so với {when}: {formatPrice(previous.net_sales)}.
        </>,
      );
  }
  if (report.collected || report.refunded || report.awaiting_payment_value)
    points.push(
      <>
        Tiền thực nhận trong kỳ{" "}
        <strong>{formatPrice(report.net_collected)}</strong>
        {report.awaiting_payment_value > 0 && (
          <>
            ; còn <strong>{formatPrice(report.awaiting_payment_value)}</strong>{" "}
            đang chờ khách thanh toán
          </>
        )}
        .
      </>,
    );
  if (report.cancelled_order_count || report.returned_order_count)
    points.push(
      <>
        {[
          report.cancelled_order_count &&
            `${report.cancelled_order_count} đơn bị hủy`,
          report.returned_order_count &&
            `${report.returned_order_count} đơn trả hàng`,
        ]
          .filter(Boolean)
          .join(" và ")}
        {report.cancelled_order_count
          ? ` (tỷ lệ hủy ${formatPercent(rate(report.cancelled_order_count, report.order_count))})`
          : ""}
        .
      </>,
    );
  return (
    <section
      aria-labelledby="finance-summary-title"
      className={`${panelClass} border-[#cfdcc4] bg-[#f6f9f1]`}
    >
      <h2
        id="finance-summary-title"
        className="text-xs font-semibold tracking-[0.12em] text-[#557a3d] uppercase"
      >
        Tóm tắt
      </h2>
      {report.order_count === 0 ? (
        <p className="mt-2 text-lg leading-8 text-[#21372b]">
          {hasAnyOrders
            ? `${phrase} chưa có đơn hàng nào.`
            : "Cửa hàng chưa có đơn hàng nào. Khi có đơn đầu tiên, báo cáo sẽ tự hiện số liệu."}
        </p>
      ) : (
        <p className="mt-2 text-lg leading-8 text-[#21372b]">
          {phrase}, cửa hàng có <strong>{report.order_count} đơn hàng</strong>,
          doanh thu <strong>{formatPrice(report.net_sales)}</strong>
          {report.gross_profit !== null ? (
            <>
              {" "}
              và lãi gộp ước tính{" "}
              <strong>{formatPrice(report.gross_profit)}</strong>.
            </>
          ) : (
            "."
          )}
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
      {missingCost > 0 && (
        <div className="mt-4">
          <Notice tone="warning" title="Chưa tính được lãi gộp của cả kỳ">
            {missingCost}/{report.cost_order_count} đơn được đặt khi sản phẩm
            chưa có giá vốn, nên hệ thống không đoán con số lãi. Đơn cũ không
            sửa được; hãy{" "}
            <Link
              href="/admin/products"
              className="font-medium underline underline-offset-4"
            >
              nhập giá vốn cho sản phẩm
            </Link>{" "}
            để các đơn mới được tính lãi đầy đủ.
          </Notice>
        </div>
      )}
    </section>
  );
}

function Waterfall({ report }: { report: StoreReport }) {
  const minus = (value: number) =>
    value ? `−${formatPrice(value)}` : formatPrice(0);
  const rows: {
    label: string;
    note?: string;
    value: string;
    total?: boolean;
  }[] = [
    {
      label: "Tổng tiền hàng khách đặt",
      note: "Giá bán của mọi đơn trong kỳ, chưa trừ gì (GMV)",
      value: formatPrice(report.gross_sales),
    },
    { label: "Giảm giá, voucher", value: minus(report.discounts) },
    { label: "Đơn đã hủy", value: minus(report.cancelled_sales) },
    { label: "Đơn trả hàng", value: minus(report.returned_sales) },
    {
      label: "Đơn đã hoàn tiền khác",
      value: minus(report.refunded_sales),
    },
    {
      label: "Doanh thu",
      note: "Chưa gồm phí giao hàng",
      value: formatPrice(report.net_sales),
      total: true,
    },
    {
      label: "Giá vốn hàng đã bán",
      note: report.damaged_return_cost
        ? `Gồm ${formatPrice(report.damaged_return_cost)} hàng trả về không bán lại được`
        : report.damaged_return_cost === null
          ? "Có hàng trả về chưa rõ giá vốn"
          : "Giá vốn lưu lúc khách đặt hàng",
      value: report.cogs === null ? "Chưa đủ giá vốn" : minus(report.cogs),
    },
    {
      label: "Lãi gộp ước tính",
      value: costValue(report.gross_profit),
      total: true,
    },
  ];
  return (
    <>
      <dl className="mt-4 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-start justify-between gap-4 py-2.5 ${row.total ? "my-1 rounded-lg bg-[#f4f6f0] px-3 font-semibold text-[#21372b]" : "border-b border-[#edf0e7] text-[#3f4f3c] last:border-0"}`}
          >
            <dt className="min-w-0">
              {row.label}
              {row.note && (
                <span className="block text-xs font-normal text-[#6b7867]">
                  {row.note}
                </span>
              )}
            </dt>
            <dd className="shrink-0 text-right tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-5 text-[#6b7867]">
        Lãi gộp chưa trừ quảng cáo, tiền trả đơn vị vận chuyển và chi phí vận
        hành, nên chưa phải lãi ròng. Phí giao hàng khách trả (
        {formatPrice(report.shipping_charged)}) được tính riêng, không nằm trong
        doanh thu.
      </p>
    </>
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
  const firstOrderDate = useMemo(
    () =>
      orders.reduce((first, order) => {
        const date = storeDate(order.created_at);
        return date && (!first || date < first) ? date : first;
      }, ""),
    [orders],
  );
  const [range, setRange] = useState(initialRange);
  const [selection, setSelection] = useState<ReportSelection>(() =>
    matchPreset(initialRange, new Date(), financePresets),
  );
  const [live, setLive] = useState(false);
  const [productRank, setProductRank] = useState<"quantity" | "profit">(
    "quantity",
  );
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [pending, startTransition] = useTransition();
  const [chart, setChart] = useState<"revenue" | "orders">("revenue");
  const [grouping, setGrouping] = useState<ReportGrouping>(() =>
    suggestedGrouping(initialRange, firstOrderDate),
  );
  const invalidRange = Boolean(range.from && range.to && range.from > range.to);
  const report = useMemo(
    () => buildStoreReport(orders, range),
    [orders, range],
  );
  const compareRange = useMemo(
    () => (invalidRange ? null : comparisonRange(range, selection)),
    [invalidRange, range, selection],
  );
  const previous = useMemo(
    () => (compareRange ? buildStoreReport(orders, compareRange) : null),
    [orders, compareRange],
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
  function changeRange(next: ReportRange, nextSelection: ReportSelection) {
    setRange(next);
    setSelection(nextSelection);
    if (!(next.from && next.to && next.from > next.to))
      setGrouping(suggestedGrouping(next, firstOrderDate));
  }
  function choosePreset(preset: ReportPreset) {
    changeRange(presetRange(new Date(), preset), preset);
  }
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
  const compareText = compareRange
    ? `So sánh với ${comparisonLabel(selection)}: ${formatRange(compareRange)}`
    : undefined;
  const delta = (current: number | null, before: number | null | undefined) =>
    !previous || (current === 0 && before === 0) ? null : current === null ||
      before === null ||
      before === undefined ? (
      <p className="mt-3 text-xs text-[#6b7867]">
        {current === null ? "Kỳ này" : "Kỳ trước"} thiếu giá vốn nên chưa so
        sánh được
      </p>
    ) : (
      <DeltaBadge
        change={percentChange(current, before)}
        label={comparisonLabel(selection)}
      />
    );
  const visibleProducts = showAllProducts
    ? rankedProducts
    : rankedProducts.slice(0, 5);
  const productMax = Math.max(
    1,
    ...rankedProducts.map((product) =>
      productRank === "profit" ? (product.gross_profit ?? 0) : product.quantity,
    ),
  );
  const statusRows = Object.entries(report.status_counts) as [
    keyof typeof orderLabels,
    number,
  ][];
  const detailGroups: {
    title: string;
    rows: { label: string; value: string | number; note: string }[];
  }[] = [
    {
      title: "Doanh thu",
      rows: [
        {
          label: "Tổng tiền hàng (GMV)",
          value: formatPrice(report.gross_sales),
          note: "Trước giảm giá, hủy và hoàn; không gồm phí giao hàng",
        },
        {
          label: "Giảm giá đã áp dụng",
          value: formatPrice(report.discounts),
          note: "Trên đơn chưa hủy/trả hàng",
        },
        {
          label: "Giá trị sản phẩm đã hủy",
          value: formatPrice(report.cancelled_sales),
          note: "Trước giảm giá, trong đơn hủy",
        },
        {
          label: "Giá trị sản phẩm trả hàng",
          value: formatPrice(report.returned_sales),
          note: "Trước giảm giá; không trừ trùng vào doanh thu",
        },
        {
          label: "Giá trị đã hoàn tiền khác",
          value: formatPrice(report.refunded_sales),
          note: "Sau giảm giá; đơn trong kỳ đã hoàn tiền",
        },
        {
          label: "Doanh thu sản phẩm thuần",
          value: formatPrice(report.net_sales),
          note: "GMV trừ giảm giá, đơn hủy/trả hàng và hoàn tiền",
        },
      ],
    },
    {
      title: "Giá vốn và lãi",
      rows: [
        {
          label: "Giá vốn sản phẩm",
          value: costValue(report.cogs),
          note: `${report.cost_order_count - report.missing_cost_order_count}/${report.cost_order_count} đơn có đủ giá vốn lúc đặt; gồm hàng hoàn không nhập kho`,
        },
        {
          label: "Chi phí hàng hoàn không nhập kho",
          value: costValue(report.damaged_return_cost),
          note: "Đã nằm trong giá vốn; không trừ lần thứ hai",
        },
        {
          label: "Lợi nhuận gộp dự kiến",
          value: costValue(report.gross_profit),
          note: "Doanh thu thuần trừ giá vốn; gồm đơn chưa hoàn tất",
        },
      ],
    },
    {
      title: "Đơn hàng",
      rows: [
        {
          label: "Đơn được đặt",
          value: report.order_count,
          note: `${report.cancelled_order_count} hủy · ${report.returned_order_count} trả hàng · ${report.successful_order_count} hoàn tất đã thanh toán`,
        },
        {
          label: "Tỷ lệ hủy / hoàn tất đã thanh toán",
          value: `${formatPercent(rate(report.cancelled_order_count, report.order_count))} / ${formatPercent(rate(report.successful_order_count, report.order_count))}`,
          note: "Trên tổng số đơn đặt trong kỳ",
        },
        {
          label: "Đơn đã hoàn tiền",
          value: report.refunded_order_count,
          note: "Đơn đặt trong kỳ; có thể gồm đơn đã trả hàng",
        },
        {
          label: "Giá trị trung bình đơn hoàn tất (AOV)",
          value: formatPrice(report.completed_average_order_value),
          note: "Đơn hoàn tất đã thanh toán; không gồm phí giao hàng",
        },
      ],
    },
    {
      title: "Tiền và phí giao hàng",
      rows: [
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
        {
          label: "Chờ ghi nhận thanh toán",
          value: formatPrice(report.awaiting_payment_value),
          note: "Đơn chưa hủy/trả hàng trong kỳ; gồm phí giao hàng",
        },
        {
          label: "Phí giao hàng trên đơn còn hiệu lực",
          value: formatPrice(report.shipping_charged),
          note: "Tách khỏi doanh thu; chưa trừ phí trả đơn vị vận chuyển",
        },
      ],
    },
  ];
  return (
    <div className="space-y-5">
      <ReportModules range={invalidRange ? undefined : range} />
      <PeriodPicker
        range={range}
        selection={selection}
        presets={financePresets}
        onPreset={choosePreset}
        onCustom={(next) => changeRange(next, "custom")}
        comparison={compareText}
        actions={
          <>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => startTransition(() => router.refresh())}
            >
              <RefreshCw
                className={`size-4 ${pending ? "animate-spin" : ""}`}
              />
              {pending ? "Đang làm mới…" : "Làm mới"}
            </Button>
            <Button
              variant="outline"
              onClick={exportReport}
              disabled={invalidRange}
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
      {invalidRange ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Ngày bắt đầu phải trước hoặc cùng ngày kết thúc.
        </p>
      ) : (
        <>
          <FinanceSummary
            report={report}
            previous={previous}
            selection={selection}
            range={range}
            compareRange={compareRange}
            hasAnyOrders={orders.length > 0}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Doanh thu"
              value={formatPrice(report.net_sales)}
              delta={delta(report.net_sales, previous?.net_sales)}
              hint="Tiền hàng sau giảm giá, đã trừ đơn hủy, trả hàng và hoàn tiền. Chưa gồm phí giao hàng."
            />
            <KpiCard
              label="Lãi gộp ước tính"
              value={
                report.gross_profit === null
                  ? "Chưa tính được"
                  : formatPrice(report.gross_profit)
              }
              muted={report.gross_profit === null}
              delta={delta(report.gross_profit, previous?.gross_profit)}
              hint={
                report.gross_profit === null
                  ? `${report.missing_cost_order_count} đơn chưa có giá vốn lúc đặt hàng.`
                  : `Doanh thu trừ giá vốn hàng bán${report.net_sales > 0 ? ` (≈ ${formatPercent(report.gross_profit / report.net_sales)} doanh thu)` : ""}. Chưa trừ chi phí khác.`
              }
            />
            <KpiCard
              label="Số đơn hàng"
              value={report.order_count}
              delta={delta(report.order_count, previous?.order_count)}
              hint={`${report.successful_order_count} đã giao & thanh toán · ${report.cancelled_order_count} hủy · ${report.returned_order_count} trả hàng`}
            />
            <KpiCard
              label="Tiền thực nhận"
              value={formatPrice(report.net_collected)}
              delta={delta(report.net_collected, previous?.net_collected)}
              hint="Tiền khách đã trả trong kỳ trừ tiền hoàn lại, gồm phí giao hàng."
            />
          </div>
          <ReportSection
            title={
              chart === "revenue"
                ? "Doanh thu và lãi theo thời gian"
                : "Số đơn theo thời gian"
            }
            question={
              chart === "revenue"
                ? "Ngày nào bán tốt? Doanh thu đang tăng hay giảm? Rê chuột hoặc chạm vào biểu đồ để xem từng kỳ."
                : "Ngày nào có nhiều đơn? Tính cả đơn đã hủy. Rê chuột hoặc chạm vào biểu đồ để xem từng kỳ."
            }
            actions={
              <>
                <Segmented
                  label="Chỉ số trên biểu đồ"
                  value={chart}
                  onChange={setChart}
                  options={[
                    { value: "revenue", label: "Doanh thu & lãi" },
                    { value: "orders", label: "Số đơn" },
                  ]}
                />
                <Segmented
                  label="Nhóm theo"
                  value={grouping}
                  onChange={setGrouping}
                  options={groupingOptions}
                />
              </>
            }
          >
            {report.daily.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#cfd9c8] bg-[#fafbf7] px-5 py-10 text-center">
                <p className="text-sm leading-6 text-[#4f5d4b]">
                  {orders.length
                    ? "Chưa có đơn hàng hay khoản thu nào trong khoảng thời gian này."
                    : "Biểu đồ sẽ hiện khi cửa hàng có đơn hàng đầu tiên."}
                </p>
                {orders.length > 0 && (
                  <>
                    <p className="mt-1 text-xs text-[#6b7867]">
                      Thử xem khoảng thời gian dài hơn. File CSV vẫn tải được
                      (các số bằng 0).
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {(["last30", "year", "all"] as const)
                        .filter((preset) => preset !== selection)
                        .map((preset) => (
                          <Button
                            key={preset}
                            size="sm"
                            variant="outline"
                            onClick={() => choosePreset(preset)}
                          >
                            Xem{" "}
                            {preset === "last30"
                              ? "30 ngày qua"
                              : preset === "year"
                                ? "năm nay"
                                : "từ trước đến nay"}
                          </Button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <FinanceTrendChart
                  rows={trend}
                  grouping={grouping}
                  metric={chart}
                />
                <MoreDetails
                  className="mt-4"
                  summary={`Xem bảng số liệu theo ${groupingNames[grouping]}`}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full whitespace-nowrap text-left text-xs">
                      <caption className="sr-only">
                        Doanh thu, đơn hàng và dòng tiền theo{" "}
                        {groupingNames[grouping]} (giờ Việt Nam)
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
                            "Tổng tiền hàng (GMV)",
                            "Doanh thu",
                            "Tiền đã thu",
                            "Tiền hoàn",
                            "Thu ròng",
                            "Giá vốn",
                            "Lãi gộp ước tính",
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
                      <tbody className="tabular-nums">
                        {trend.map((row) => (
                          <tr
                            key={row.date}
                            className="border-b border-[#edf0e7]"
                          >
                            <th scope="row" className="py-2.5 pr-4 font-medium">
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
                  <p className="mt-3 text-xs leading-5 text-[#6b7867]">
                    Tuần bắt đầu thứ Hai; tháng theo lịch Việt Nam. Kỳ đầu/cuối
                    chỉ gồm những ngày trong khoảng đã chọn. File CSV dùng cùng
                    cách nhóm.
                  </p>
                </MoreDetails>
              </>
            )}
          </ReportSection>
          {/* Breakdowns of an empty period would only repeat zeros. */}
          {report.daily.length > 0 && (
            <>
              <div className="grid gap-5 lg:grid-cols-2">
                <ReportSection
                  title="Từ tiền hàng đến tiền lãi"
                  question="Doanh thu và lãi gộp của kỳ này được tính ra như thế nào."
                >
                  <Waterfall report={report} />
                </ReportSection>
                <ReportSection
                  title="Sản phẩm bán chạy"
                  question="Món nào bán được nhiều và mang lại nhiều lãi nhất?"
                  actions={
                    <Segmented
                      label="Xếp hạng sản phẩm theo"
                      value={productRank}
                      onChange={setProductRank}
                      options={[
                        { value: "quantity", label: "Bán nhiều" },
                        { value: "profit", label: "Lãi nhiều" },
                      ]}
                    />
                  }
                >
                  {report.products.length === 0 ? (
                    <p className="mt-5 text-sm text-[#6b7867]">
                      Chưa có sản phẩm nào được bán trong khoảng thời gian này.
                    </p>
                  ) : (
                    <>
                      <ol className="mt-4 space-y-3.5">
                        {visibleProducts.map((product, index) => {
                          const value =
                            productRank === "profit"
                              ? (product.gross_profit ?? 0)
                              : product.quantity;
                          return (
                            <li key={product.id}>
                              <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="min-w-0 font-medium text-[#21372b]">
                                  <span className="mr-1.5 text-[#7a8574]">
                                    {index + 1}.
                                  </span>
                                  {product.name}
                                </span>
                                <span className="shrink-0 text-right">
                                  {productRank === "profit" ? (
                                    <>
                                      Lãi{" "}
                                      <strong className="font-semibold">
                                        {costValue(product.gross_profit)}
                                      </strong>
                                    </>
                                  ) : (
                                    <>
                                      Đã bán{" "}
                                      <strong className="font-semibold">
                                        {product.quantity}
                                      </strong>
                                    </>
                                  )}
                                </span>
                              </div>
                              <div className="mt-1.5 h-2 rounded-full bg-[#edf1e7]">
                                <div
                                  className="h-full rounded-full bg-[#5f8a45]"
                                  style={{
                                    width: `${Math.max(0, (value / productMax) * 100)}%`,
                                  }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-[#6b7867]">
                                {productRank === "profit"
                                  ? `Đã bán ${product.quantity}`
                                  : `Lãi ${costValue(product.gross_profit)}`}{" "}
                                · Doanh thu{" "}
                                {product.net_value === null
                                  ? "thiếu phân bổ ưu đãi"
                                  : formatPrice(product.net_value)}
                              </p>
                            </li>
                          );
                        })}
                      </ol>
                      {rankedProducts.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          aria-expanded={showAllProducts}
                          onClick={() => setShowAllProducts((value) => !value)}
                        >
                          {showAllProducts
                            ? "Thu gọn"
                            : `Xem tất cả ${rankedProducts.length} sản phẩm`}
                        </Button>
                      )}
                      <p className="mt-3 text-xs leading-5 text-[#6b7867]">
                        Số lượng và doanh thu chỉ tính đơn chưa hủy/hoàn tiền.
                        Lãi đã trừ giá vốn lúc đặt, kể cả hàng trả về không bán
                        lại được, nên có sản phẩm có thể lãi âm.
                      </p>
                    </>
                  )}
                </ReportSection>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <ReportSection
                  title="Tiền đã thu"
                  question="Tiền khách trả và tiền hoàn lại trong kỳ, tính theo ngày nhận tiền thực tế."
                >
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <SmallStat
                      label="Khách đã trả"
                      value={formatPrice(report.collected)}
                      hint="Đã xác nhận nhận tiền"
                    />
                    <SmallStat
                      label="Đã hoàn cho khách"
                      value={formatPrice(report.refunded)}
                      hint="Ghi nhận hoàn tiền"
                    />
                    <SmallStat
                      label="Thực nhận"
                      value={formatPrice(report.net_collected)}
                      hint="Đã trả trừ đã hoàn"
                    />
                    <SmallStat
                      label="Đang chờ khách trả"
                      value={formatPrice(report.awaiting_payment_value)}
                      hint="Đơn trong kỳ chưa thanh toán"
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#6b7867]">
                    Đã gồm phí giao hàng. Vì tính theo ngày nhận/hoàn tiền nên
                    có thể gồm cả đơn đặt trước kỳ này — đây là lý do số này
                    khác doanh thu.
                  </p>
                </ReportSection>
                <ReportSection
                  title="Khách thanh toán bằng cách nào?"
                  question="Doanh thu chia theo cách thanh toán (tính theo ngày đặt đơn, chưa gồm phí giao hàng)."
                >
                  <PaymentShareChart report={report} />
                  {report.payment_breakdown.length > 0 && (
                    <MoreDetails
                      className="mt-4"
                      summary="Chi tiết từng cách thanh toán"
                    >
                      <ul className="space-y-4">
                        {report.payment_breakdown.map((row) => (
                          <li key={row.method}>
                            <p className="text-sm font-medium text-[#21372b]">
                              {financePaymentLabels[row.method]} ·{" "}
                              <span className="font-normal text-[#6b7867]">
                                {row.order_count} đơn
                              </span>
                            </p>
                            <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                              {[
                                ["Doanh thu", row.net_sales],
                                ["Đã xác nhận", row.collected],
                                ["Đã hoàn", row.refunded],
                                ["Chờ thanh toán", row.awaiting],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <dt className="text-[#6b7867]">{label}</dt>
                                  <dd className="font-medium tabular-nums text-[#21372b]">
                                    {formatPrice(Number(value))}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </li>
                        ))}
                      </ul>
                    </MoreDetails>
                  )}
                </ReportSection>
              </div>
              <ReportSection
                title="Tình trạng đơn hàng"
                question="Đơn đặt trong kỳ đang ở bước nào, bao nhiêu đơn thành công hoặc bị hủy."
              >
                <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                  <BarList
                    valueLabel="Số đơn theo trạng thái"
                    rows={statusRows.map(([status, count]) => ({
                      key: status,
                      label: orderLabels[status],
                      value: count,
                      display: `${count} đơn`,
                    }))}
                  />
                  <div className="grid grid-cols-2 content-start gap-3">
                    <SmallStat
                      label="Tỷ lệ thành công"
                      value={formatPercent(
                        rate(report.successful_order_count, report.order_count),
                      )}
                      hint="Đơn đã giao và đã thanh toán"
                    />
                    <SmallStat
                      label="Tỷ lệ hủy"
                      value={formatPercent(
                        rate(report.cancelled_order_count, report.order_count),
                      )}
                      hint="Trên tổng số đơn đặt"
                    />
                    <SmallStat
                      label="Trung bình mỗi đơn"
                      value={formatPrice(report.completed_average_order_value)}
                      hint="Đơn thành công, chưa gồm phí giao hàng (AOV)"
                    />
                    <SmallStat
                      label="Đơn đã hoàn tiền"
                      value={report.refunded_order_count}
                      hint="Có thể gồm đơn trả hàng"
                    />
                  </div>
                </div>
              </ReportSection>
            </>
          )}
          <MoreDetails
            className="bg-white"
            summary={<span>Tất cả chỉ số chi tiết (dành cho kế toán)</span>}
          >
            <div className="grid gap-6 md:grid-cols-2">
              {detailGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-semibold">{group.title}</h3>
                  <dl className="mt-2">
                    {group.rows.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-start justify-between gap-4 border-b border-[#edf0e7] py-2.5 last:border-0"
                      >
                        <dt className="min-w-0 text-sm text-[#3f4f3c]">
                          {row.label}
                          <span className="block text-xs text-[#6b7867]">
                            {row.note}
                          </span>
                        </dt>
                        <dd className="shrink-0 text-right text-sm font-semibold tabular-nums">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </MoreDetails>
          <MoreDetails
            className="bg-white"
            summary="Giải thích các con số và cách tính"
          >
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#3f4f3c]">
              <li>
                Ngày tính theo giờ Việt Nam. <strong>Doanh thu</strong> và số
                đơn tính theo <em>ngày khách đặt đơn</em> và trạng thái hiện tại
                của đơn. <strong>Tiền đã thu</strong> tính theo{" "}
                <em>ngày nhận/hoàn tiền</em>, kể cả đơn đặt trước kỳ.
              </li>
              <li>
                <strong>Tổng tiền hàng (GMV)</strong>: giá bán của mọi đơn,
                trước giảm giá, hủy và hoàn; không gồm phí giao hàng.
              </li>
              <li>
                <strong>Giá vốn</strong> được lưu cho từng sản phẩm lúc khách
                đặt đơn, không đổi khi sau này bạn sửa giá vốn. Đơn cũ hoặc sản
                phẩm chưa nhập giá vốn được ghi là “chưa đủ giá vốn”, không tính
                là 0.
              </li>
              <li>
                Hàng trả lại còn bán được chỉ được trừ giá vốn khi nhập lại kho;
                hàng hỏng vẫn tính là chi phí.
              </li>
              <li>
                <strong>Lãi gộp ước tính</strong> gồm cả đơn chưa hoàn tất và
                chưa trừ chi phí vận hành, giao hàng thực tế hoặc quảng cáo — vì
                thiếu các chi phí này nên chưa tính được lãi ròng hay hiệu quả
                quảng cáo (ROAS).
              </li>
              <li>
                <strong>Thu ròng / Tiền thực nhận</strong> = tiền đã xác nhận
                trừ tiền đã hoàn; đây là dòng tiền, không phải lợi nhuận.
              </li>
              <li>
                File CSV có đủ mọi chỉ số, bảng theo ngày/tuần/tháng, cách thanh
                toán và sản phẩm; vẫn tải được khi kỳ chưa có dữ liệu.
              </li>
            </ul>
          </MoreDetails>
        </>
      )}
    </div>
  );
}
