"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Order, OrderStatus } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  adminRequest,
  EmptyState,
  fieldClass,
  orderLabels,
  panelClass,
  reportError,
  StatusBadge,
} from "./admin-common";

export function OrderManager({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, OrderStatus>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const visible = orders.filter(
    (order) =>
      (filter === "all" || order.status === filter) &&
      `${order.reference} ${order.customer_name} ${order.email} ${order.phone}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  async function save(order: Order) {
    const status = drafts[order.id] || order.status;
    if (status === order.status) return;
    if (
      status === "completed" &&
      !window.confirm(
        `Đánh dấu đơn ${order.reference} đã hoàn tất? Trạng thái không thể thay đổi sau khi hoàn tất.`,
      )
    )
      return;
    if (
      status === "cancelled" &&
      !window.confirm(
        `Hủy đơn ${order.reference}? Tồn kho sẽ được hoàn lại. Đơn đã hủy không thể mở lại.`,
      )
    )
      return;
    setSaving(order.id);
    try {
      await adminRequest(`/api/admin/orders/${order.id}`, "PATCH", { status });
      toast.success("Đã cập nhật trạng thái đơn hàng.");
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(null);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-3 left-3 size-4 text-[#7c8774]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã đơn, khách hàng, email hoặc số điện thoại..."
            className="pl-10"
            aria-label="Tìm đơn hàng"
          />
        </div>
        <select
          className={`${fieldClass} sm:max-w-[200px]`}
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as OrderStatus | "all")
          }
          aria-label="Lọc trạng thái đơn"
        >
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(orderLabels).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? (
        <EmptyState>Chưa có đơn hàng phù hợp.</EmptyState>
      ) : (
        visible.map((order) => (
          <article key={order.id} className={panelClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{order.reference}</p>
                <p className="mt-1 text-sm text-[#6b7867]">
                  {order.customer_name} · {formatDate(order.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-lg font-semibold">
                  {formatPrice(order.total)}
                </p>
                <StatusBadge status={order.status} />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 border-t border-[#edf0e7] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExpanded(expanded === order.id ? null : order.id)
                }
                aria-expanded={expanded === order.id}
              >
                <ChevronDown
                  className={`size-4 transition-transform ${expanded === order.id ? "rotate-180" : ""}`}
                />
                {expanded === order.id ? "Ẩn chi tiết" : "Chi tiết đơn hàng"}
              </Button>
              <div className="flex items-center gap-2">
                <select
                  value={drafts[order.id] || order.status}
                  onChange={(event) =>
                    setDrafts((previous) => ({
                      ...previous,
                      [order.id]: event.target.value as OrderStatus,
                    }))
                  }
                  className={`${fieldClass} max-w-[180px]`}
                  disabled={
                    order.status === "cancelled" ||
                    order.status === "completed" ||
                    saving === order.id
                  }
                  aria-label={`Trạng thái đơn ${order.reference}`}
                >
                  {Object.entries(orderLabels).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={
                    order.status === "cancelled" ||
                    order.status === "completed" ||
                    saving === order.id ||
                    (drafts[order.id] || order.status) === order.status
                  }
                  onClick={() => void save(order)}
                >
                  {saving === order.id ? "Đang lưu..." : "Cập nhật"}
                </Button>
              </div>
            </div>
            {expanded === order.id && (
              <div className="mt-4 space-y-5 rounded-xl bg-[#f7f8f2] p-4 sm:p-5">
                <div className="grid gap-5 text-sm sm:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#788273]">
                      Thông tin giao hàng
                    </h3>
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="mt-1">{order.phone}</p>
                    <p className="mt-1 break-all">{order.email}</p>
                    <p className="mt-2 leading-6">
                      {order.address}, {order.city}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#788273]">
                      Thanh toán & ghi chú
                    </h3>
                    <p className="inline-flex rounded-full bg-[#f2ebd5] px-3 py-1 text-xs text-[#89763a]">
                      Chờ thanh toán
                    </p>
                    <p className="mt-3 whitespace-pre-wrap leading-6">
                      {order.note || "Khách hàng không để lại ghi chú."}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#dfe5d8] text-xs text-[#788273]">
                      <tr>
                        <th className="pb-2 font-medium">Sản phẩm</th>
                        <th className="pb-2 text-right font-medium">SL</th>
                        <th className="pb-2 text-right font-medium">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="py-2">
                            {item.name}
                            <span className="mt-1 block text-xs text-[#788273]">
                              {formatPrice(item.price)}
                            </span>
                          </td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">
                            {formatPrice(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="ml-auto max-w-xs space-y-2 border-t border-[#dfe5d8] pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt>Tạm tính</dt>
                    <dd>{formatPrice(order.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Phí giao hàng</dt>
                    <dd>{formatPrice(order.shipping_fee)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <dt>Tổng cộng</dt>
                    <dd>{formatPrice(order.total)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
