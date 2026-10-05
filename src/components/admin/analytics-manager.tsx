"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildStoreReport,
  reportCsv,
  reportDateRange,
  type ReportOrder,
  type ReportRange,
} from "@/lib/store-reports";
import { formatPrice } from "@/lib/utils";
import {
  EmptyState,
  fieldClass,
  orderLabels,
  panelClass,
} from "./admin-common";

export function AnalyticsManager({
  orders,
  initialRange,
}: {
  orders: ReportOrder[];
  initialRange: ReportRange;
}) {
  const router = useRouter();
  const [range, setRange] = useState(initialRange);
  const invalidRange = Boolean(range.from && range.to && range.from > range.to);
  const report = useMemo(
    () => buildStoreReport(orders, range),
    [orders, range],
  );
  const maxCount = Math.max(1, ...report.daily.map((row) => row.order_count));
  function exportReport() {
    const url = URL.createObjectURL(
      new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `moc-bam-bao-cao-${range.from || "bat-dau"}-${range.to || "hien-tai"}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
  const metrics = [
    {
      label: "Đơn được đặt",
      value: report.order_count,
      note: `${report.cancelled_order_count} đã hủy · ${report.completed_order_count} hoàn tất`,
    },
    {
      label: "Giá trị đơn chưa hủy",
      value: formatPrice(report.order_value),
      note: `${report.active_order_count} đơn · gồm phí giao hàng`,
    },
    {
      label: "Giá trị đơn trung bình",
      value: formatPrice(report.average_order_value),
      note: "Tính trên đơn chưa hủy",
    },
    {
      label: "Chờ ghi nhận thanh toán",
      value: formatPrice(report.awaiting_payment_value),
      note: "Đơn chưa hủy trong kỳ",
    },
    {
      label: "Tiền đã xác nhận trong kỳ",
      value: formatPrice(report.collected),
      note: "Theo ngày xác nhận thanh toán",
    },
    {
      label: "Tiền đã hoàn trong kỳ",
      value: formatPrice(report.refunded),
      note: "Theo ngày ghi nhận hoàn tiền",
    },
    {
      label: "Thu ròng trong kỳ",
      value: formatPrice(report.net_collected),
      note: "Tiền xác nhận trừ tiền hoàn",
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
          <Button variant="outline" onClick={() => router.refresh()}>
            <RefreshCw className="size-4" />
            Cập nhật
          </Button>
          <Button
            variant="outline"
            onClick={exportReport}
            disabled={invalidRange || report.daily.length === 0}
          >
            <Download className="size-4" />
            Xuất CSV
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              size="sm"
              variant="outline"
              onClick={() => setRange(reportDateRange(new Date(), days))}
            >
              {days} ngày
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRange({ from: "", to: "" })}
          >
            Tất cả
          </Button>
        </div>
        <p className="mt-4 text-xs leading-6 text-[#6b7867]">
          Ngày theo múi giờ Việt Nam. Số đơn và giá trị đơn tính theo ngày đặt.
          Các khoản thu/hoàn tính theo ngày ghi nhận thanh toán, kể cả đơn đặt
          trước kỳ hoặc đã hủy.
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
            </EmptyState>
          ) : (
            <div className={panelClass}>
              <h2 className="font-semibold">Đơn hàng theo ngày</h2>
              <p className="mt-1 text-xs text-[#6b7867]">
                Bao gồm đơn đã hủy. Chọn xem bảng để đọc giá trị và thanh toán
                từng ngày.
              </p>
              <div className="mt-6 overflow-x-auto pb-2">
                <div
                  role="img"
                  aria-label={`${report.order_count} đơn trong ${report.daily.length} ngày có hoạt động. Bảng dữ liệu chi tiết ở bên dưới.`}
                  className="flex h-44 min-w-max items-end gap-2 border-b border-[#dfe5d8]"
                >
                  {report.daily.map((row) => (
                    <div
                      key={row.date}
                      title={`${row.date}: ${row.order_count} đơn`}
                      className="flex h-full w-10 shrink-0 flex-col items-center justify-end gap-1"
                    >
                      <span className="text-[10px] text-[#6b7867]">
                        {row.order_count}
                      </span>
                      <div
                        className="w-6 rounded-t bg-[#426533]"
                        style={{
                          height: `${Math.max(row.order_count ? 3 : 0, (row.order_count / maxCount) * 110)}px`,
                        }}
                      />
                      <span className="mb-2 text-[9px] text-[#6b7867]">
                        {row.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <details className="mt-5">
                <summary className="cursor-pointer text-sm font-medium">
                  Xem bảng dữ liệu theo ngày
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full whitespace-nowrap text-left text-xs">
                    <caption className="sr-only">
                      Đơn hàng và dòng tiền theo ngày Việt Nam
                    </caption>
                    <thead className="border-b border-[#edf0e7] text-[#6b7867]">
                      <tr>
                        {[
                          "Ngày",
                          "Số đơn",
                          "Giá trị chưa hủy",
                          "Tiền xác nhận",
                          "Tiền hoàn",
                          "Thu ròng",
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
                      {report.daily.map((row) => (
                        <tr
                          key={row.date}
                          className="border-b border-[#edf0e7] last:border-0"
                        >
                          <th scope="row" className="py-3 pr-4 font-medium">
                            {row.date}
                          </th>
                          <td className="pr-4">{row.order_count}</td>
                          <td className="pr-4">
                            {formatPrice(row.order_value)}
                          </td>
                          <td className="pr-4">{formatPrice(row.collected)}</td>
                          <td className="pr-4">{formatPrice(row.refunded)}</td>
                          <td className="pr-4">
                            {formatPrice(row.collected - row.refunded)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
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
              <h2 className="font-semibold">Sản phẩm được đặt nhiều</h2>
              <p className="mt-1 text-xs leading-6 text-[#6b7867]">
                Theo số lượng trong đơn chưa hủy. Giá trị sản phẩm trước giảm
                giá, chưa gồm phí giao hàng.
              </p>
              {report.products.length === 0 ? (
                <p className="mt-5 text-sm text-[#6b7867]">
                  Chưa có sản phẩm trong khoảng ngày này.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {report.products.slice(0, 10).map((product, index) => (
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
                          {formatPrice(product.line_value)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
          <p className="text-xs leading-6 text-[#6b7867]">
            Báo cáo lấy trực tiếp từ đơn hàng và xác nhận thanh toán trong cửa
            hàng. Số tiền chỉ phản ánh các khoản đã được quản trị viên ghi nhận;
            chưa có dữ liệu lượt truy cập hay tỷ lệ chuyển đổi.
          </p>
        </>
      )}
    </div>
  );
}
