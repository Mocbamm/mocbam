import { useId } from "react";
import type {
  ReportGrouping,
  ReportTrendRow,
  StoreReport,
} from "@/lib/store-reports";
import { formatDay, weekdayLabel } from "@/lib/report-periods";
import { formatPrice } from "@/lib/utils";
import { formatCompactMoney, formatCount, formatPercent } from "./report-ui";
import { ChartLegend, TimeChart } from "./report-time-chart";

export const financePaymentLabels = {
  cod: "Tiền mặt khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản",
  unconfigured: "Chưa xác định",
};
/** Validated pair (CVD ΔE ≥ 11); unknown legacy methods stay neutral gray. */
export const financeColors = {
  revenue: "#3b6b26",
  profit: "#c27c2c",
  orders: "#3b6b26",
};
const paymentColors = {
  cod: "#3b6b26",
  bank_transfer: "#c27c2c",
  unconfigured: "#8a8f86",
};

/** Full label for tables and the chart readout, in Vietnamese date order. */
export function trendPeriodLabel(
  row: Pick<ReportTrendRow, "date" | "end_date">,
  grouping: ReportGrouping,
) {
  if (grouping === "month")
    return `Tháng ${row.date.slice(5, 7)}/${row.date.slice(0, 4)}`;
  if (grouping === "week")
    return `Tuần ${formatDay(row.date, false)} – ${formatDay(row.end_date)}`;
  return `${weekdayLabel(row.date)}, ${formatDay(row.date)}`;
}
function axisLabel(row: ReportTrendRow, grouping: ReportGrouping) {
  if (grouping === "month")
    return `T${Number(row.date.slice(5, 7))}/${row.date.slice(2, 4)}`;
  return formatDay(row.date, false);
}

export function FinanceTrendChart({
  rows,
  grouping,
  metric = "revenue",
}: {
  rows: ReportTrendRow[];
  grouping: ReportGrouping;
  metric?: "revenue" | "orders";
}) {
  const profit = (value: number | null) =>
    value === null ? "chưa đủ giá vốn" : formatPrice(value);
  const pointTitle = (index: number) => {
    const row = rows[index];
    return `${trendPeriodLabel(row, grouping)}: doanh thu ${formatPrice(row.net_sales)}; lãi gộp ${profit(row.gross_profit)}; ${row.order_count} đơn`;
  };
  const readout = (index: number) => {
    const row = rows[index];
    return (
      <>
        <p className="text-xs font-medium text-[#6b7867]">
          {trendPeriodLabel(row, grouping)}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-[#21372b]">
          {metric === "revenue" ? (
            <>
              <span>
                Doanh thu{" "}
                <strong className="font-semibold">
                  {formatPrice(row.net_sales)}
                </strong>
              </span>
              <span>
                Lãi gộp{" "}
                <strong className="font-semibold">
                  {profit(row.gross_profit)}
                </strong>
              </span>
              <span className="text-[#6b7867]">{row.order_count} đơn</span>
            </>
          ) : (
            <>
              <span>
                <strong className="font-semibold">{row.order_count}</strong> đơn
                được đặt
              </span>
              <span className="text-[#6b7867]">
                Doanh thu {formatPrice(row.net_sales)}
              </span>
            </>
          )}
        </p>
      </>
    );
  };
  if (metric === "orders")
    return (
      <TimeChart
        title={`Số đơn được đặt theo ${groupingNames[grouping]}`}
        description="Tính mọi đơn đặt trong kỳ, kể cả đơn đã hủy. Bảng số liệu ở bên dưới."
        axisLabels={rows.map((row) => axisLabel(row, grouping))}
        series={[
          {
            key: "orders",
            label: "Số đơn",
            color: financeColors.orders,
            kind: "bar",
            values: rows.map((row) => row.order_count),
          },
        ]}
        axisFormat={(value) => formatCount(value)}
        integer
        unit="đơn"
        readout={readout}
        pointTitle={pointTitle}
      />
    );
  return (
    <TimeChart
      legend={
        <ChartLegend
          items={[
            { label: "Doanh thu", color: financeColors.revenue },
            { label: "Lãi gộp ước tính", color: financeColors.profit },
          ]}
        />
      }
      title="Doanh thu và lãi gộp ước tính theo thời gian"
      description="Đơn vị: đồng. Đường lãi gộp bị ngắt ở kỳ thiếu giá vốn; lãi âm được vẽ dưới đường 0. Bảng số liệu ở bên dưới."
      axisLabels={rows.map((row) => axisLabel(row, grouping))}
      series={[
        {
          key: "net-sales",
          label: "Doanh thu",
          color: financeColors.revenue,
          kind: "line",
          values: rows.map((row) => row.net_sales),
        },
        {
          key: "gross-profit",
          label: "Lãi gộp ước tính",
          color: financeColors.profit,
          kind: "line",
          values: rows.map((row) => row.gross_profit),
        },
      ]}
      axisFormat={formatCompactMoney}
      unit="đồng (₫)"
      readout={readout}
      pointTitle={pointTitle}
    />
  );
}
const groupingNames = { day: "ngày", week: "tuần", month: "tháng" };

export function PaymentShareChart({ report }: { report: StoreReport }) {
  const id = useId();
  const rows = report.payment_breakdown.filter((row) => row.net_sales > 0);
  const total = rows.reduce((sum, row) => sum + row.net_sales, 0);
  if (!total)
    return (
      <p className="mt-4 text-sm text-[#6b7867]">
        Chưa có doanh thu để chia theo cách thanh toán.
      </p>
    );
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const gap = rows.length > 1 ? 2 : 0;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-6">
      <svg
        className="size-40 shrink-0"
        viewBox="0 0 180 180"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>Tỷ lệ doanh thu theo cách thanh toán</title>
        <desc id={`${id}-description`}>
          {rows
            .map(
              (row) =>
                `${financePaymentLabels[row.method]}: ${formatPercent(row.net_sales / total)}, ${formatPrice(row.net_sales)}`,
            )
            .join("; ")}
          . Không gồm phí giao hàng; đơn hủy, trả hàng hoặc hoàn tiền không tạo
          doanh thu.
        </desc>
        {rows.map((row, index) => {
          const length = (row.net_sales / total) * circumference;
          const offset = rows
            .slice(0, index)
            .reduce(
              (sum, previous) =>
                sum + (previous.net_sales / total) * circumference,
              0,
            );
          return (
            <circle
              key={row.method}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={paymentColors[row.method]}
              strokeWidth="24"
              strokeDasharray={`${Math.max(0, length - gap)} ${circumference - Math.max(0, length - gap)}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
            >
              <title>
                {`${financePaymentLabels[row.method]}: ${formatPrice(row.net_sales)}`}
              </title>
            </circle>
          );
        })}
        <text x="90" y="85" textAnchor="middle" fontSize="12" fill="#6b7867">
          Doanh thu
        </text>
        <text
          x="90"
          y="104"
          textAnchor="middle"
          fontSize="15"
          fontWeight="600"
          fill="#21372b"
        >
          {formatCompactMoney(total)}
        </text>
      </svg>
      <ul className="min-w-52 flex-1 space-y-3 text-sm">
        {rows.map((row) => (
          <li key={row.method} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-1.5 size-3 shrink-0 rounded-sm"
              style={{ backgroundColor: paymentColors[row.method] }}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[#21372b]">
                {financePaymentLabels[row.method]}
              </span>
              <span className="text-[#6b7867]">
                <strong className="font-semibold text-[#21372b]">
                  {formatPercent(row.net_sales / total)}
                </strong>{" "}
                · {formatPrice(row.net_sales)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
