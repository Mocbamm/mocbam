import { useId } from "react";
import type {
  ReportGrouping,
  ReportTrendRow,
  StoreReport,
} from "@/lib/store-reports";
import { formatPrice } from "@/lib/utils";

export const financePaymentLabels = {
  cod: "Tiền mặt / COD",
  bank_transfer: "Chuyển khoản",
  unconfigured: "Chưa xác định",
};
const paymentColors = {
  cod: "#426533",
  bank_transfer: "#b58246",
  unconfigured: "#788273",
};

export function trendPeriodLabel(
  row: ReportTrendRow,
  grouping: ReportGrouping,
) {
  if (grouping === "month") return row.date.slice(0, 7);
  if (grouping === "week") return `${row.date} – ${row.end_date}`;
  return row.date;
}

export function FinanceTrendChart({
  rows,
  grouping,
}: {
  rows: ReportTrendRow[];
  grouping: ReportGrouping;
}) {
  const id = useId();
  const width = Math.max(680, rows.length * 58 + 100);
  const height = 285;
  const left = 80;
  const right = width - 24;
  const top = 20;
  const bottom = 230;
  const values = rows.flatMap((row) => [row.net_sales, row.gross_profit ?? 0]);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const y = (value: number) =>
    bottom - ((value - min) / (max - min)) * (bottom - top);
  const x = (index: number) =>
    rows.length === 1
      ? (left + right) / 2
      : left + (index / (rows.length - 1)) * (right - left);
  function line(key: "net_sales" | "gross_profit") {
    let continuing = false;
    return rows
      .map((row, index) => {
        const value = row[key];
        if (value === null) {
          continuing = false;
          return "";
        }
        const command = continuing ? "L" : "M";
        continuing = true;
        return `${command}${x(index)},${y(value)}`;
      })
      .join(" ");
  }
  const tickFormat = new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const labelEvery = Math.max(1, Math.ceil(rows.length / 12));
  const ticks = [
    ...new Set([
      0,
      ...[0, 1, 2, 3, 4].map((index) => min + ((max - min) * index) / 4),
    ]),
  ];
  return (
    <div className="mt-5 overflow-x-auto pb-2">
      <svg
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
        viewBox={`0 0 ${width} ${height}`}
        className="h-72 w-full"
        style={{ minWidth: width }}
      >
        <title id={`${id}-title`}>
          Xu hướng doanh thu thuần và lợi nhuận gộp dự kiến
        </title>
        <desc id={`${id}-description`}>
          Đơn vị VND. Đường lợi nhuận ngắt ở kỳ thiếu giá vốn; bảng số liệu ở
          bên dưới. Lợi nhuận âm được vẽ dưới đường 0.
        </desc>
        {ticks.map((value) => {
          return (
            <g key={value}>
              <line
                x1={left}
                x2={right}
                y1={y(value)}
                y2={y(value)}
                stroke="#edf0e7"
              />
              <text
                x={left - 10}
                y={y(value) + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6b7867"
              >
                {tickFormat.format(value)}
              </text>
            </g>
          );
        })}
        <line
          x1={left}
          x2={right}
          y1={y(0)}
          y2={y(0)}
          stroke="#a6b39d"
          strokeDasharray="4 4"
        />
        <path
          data-series="net-sales"
          d={line("net_sales")}
          fill="none"
          stroke="#426533"
          strokeWidth="2.5"
        />
        <path
          data-series="gross-profit"
          d={line("gross_profit")}
          fill="none"
          stroke="#b58246"
          strokeWidth="2.5"
        />
        {rows.map((row, index) => (
          <g key={row.date}>
            <title>
              {`${trendPeriodLabel(row, grouping)}: doanh thu thuần ${formatPrice(row.net_sales)}; lợi nhuận gộp ${row.gross_profit === null ? "chưa đủ giá vốn" : formatPrice(row.gross_profit)}`}
            </title>
            <circle
              cx={x(index)}
              cy={y(row.net_sales)}
              r="3.5"
              fill="#426533"
            />
            {row.gross_profit !== null && (
              <circle
                cx={x(index)}
                cy={y(row.gross_profit)}
                r="3.5"
                fill="#b58246"
              />
            )}
            {(index % labelEvery === 0 || index === rows.length - 1) && (
              <text
                x={x(index)}
                y={bottom + 24}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7867"
              >
                {grouping === "month"
                  ? row.date.slice(0, 7)
                  : row.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function PaymentShareChart({ report }: { report: StoreReport }) {
  const id = useId();
  const rows = report.payment_breakdown.filter((row) => row.net_sales > 0);
  const total = rows.reduce((sum, row) => sum + row.net_sales, 0);
  if (!total)
    return (
      <p className="mt-4 text-sm text-[#6b7867]">
        Chưa có doanh thu sản phẩm thuần để phân bổ.
      </p>
    );
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-8">
      <svg
        className="size-48 shrink-0"
        viewBox="0 0 180 180"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>
          Tỷ trọng doanh thu theo phương thức thanh toán
        </title>
        <desc id={`${id}-description`}>
          {rows
            .map(
              (row) =>
                `${financePaymentLabels[row.method]}: ${((row.net_sales / total) * 100).toFixed(1)}%, ${formatPrice(row.net_sales)}`,
            )
            .join("; ")}
          . Không gồm phí giao hàng; đơn hủy, trả hàng hoặc hoàn tiền không tạo
          doanh thu.
        </desc>
        {rows.map((row, index) => {
          const length = (row.net_sales / total) * circumference;
          const currentOffset = rows
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
              strokeWidth="25"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-currentOffset}
              transform="rotate(-90 90 90)"
            >
              <title>
                {`${financePaymentLabels[row.method]}: ${formatPrice(row.net_sales)}`}
              </title>
            </circle>
          );
        })}
        <text x="90" y="86" textAnchor="middle" fontSize="12" fill="#6b7867">
          Doanh thu thuần
        </text>
        <text
          x="90"
          y="106"
          textAnchor="middle"
          fontSize="14"
          fontWeight="600"
          fill="#294836"
        >
          {new Intl.NumberFormat("vi-VN", {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(total)}{" "}
          ₫
        </text>
      </svg>
      <ul className="min-w-48 flex-1 space-y-3 text-sm">
        {rows.map((row) => (
          <li
            key={row.method}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 rounded-full"
                style={{ backgroundColor: paymentColors[row.method] }}
              />
              {financePaymentLabels[row.method]}
            </span>
            <span className="font-medium">
              {((row.net_sales / total) * 100).toFixed(1)}% ·{" "}
              {formatPrice(row.net_sales)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
