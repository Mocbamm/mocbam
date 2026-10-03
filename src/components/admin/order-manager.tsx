"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Order, OrderStatus } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  paymentMethodLabels,
  paymentStatusLabels,
  transferReference,
} from "@/lib/payments";
import {
  adminRequest,
  EmptyState,
  fieldClass,
  orderLabels,
  panelClass,
  reportError,
  StatusBadge,
} from "./admin-common";

type PaymentEvent = {
  id: string;
  event: "paid" | "refunded";
  amount: number;
  note: string;
  created_at: string;
};

function paymentDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}
function PaymentBadge({ status }: { status: Order["payment_status"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status === "paid" ? "bg-green-50 text-green-800" : status === "refunded" ? "bg-blue-50 text-blue-800" : "bg-[#f2ebd5] text-[#89763a]"}`}
    >
      {paymentStatusLabels[status]}
    </span>
  );
}

export function OrderManager({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, OrderStatus>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [paymentSaving, setPaymentSaving] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refreshing, startRefresh] = useTransition();
  const [history, setHistory] = useState<Record<string, PaymentEvent[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [historyErrors, setHistoryErrors] = useState<Record<string, string>>(
    {},
  );
  const historyRequests = useRef<Record<string, number>>({});
  const busy = saving !== null || paymentSaving !== null || refreshing;
  const visible = orders.filter(
    (order) =>
      (filter === "all" || order.status === filter) &&
      `${order.reference} ${order.customer_name} ${order.email} ${order.phone}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  async function loadHistory(order: Order) {
    const requestId = (historyRequests.current[order.id] || 0) + 1;
    historyRequests.current[order.id] = requestId;
    setHistoryLoading((previous) => ({ ...previous, [order.id]: true }));
    setHistoryErrors((previous) => ({ ...previous, [order.id]: "" }));
    try {
      const result = await adminRequest(
        `/api/admin/orders/${order.id}/payment`,
        "GET",
      );
      if (historyRequests.current[order.id] !== requestId) return;
      setHistory((previous) => ({ ...previous, [order.id]: result.data }));
    } catch (error) {
      if (historyRequests.current[order.id] !== requestId) return;
      setHistoryErrors((previous) => ({
        ...previous,
        [order.id]:
          error instanceof Error
            ? error.message
            : "Không thể tải lịch sử thanh toán.",
      }));
    } finally {
      if (historyRequests.current[order.id] === requestId)
        setHistoryLoading((previous) => ({ ...previous, [order.id]: false }));
    }
  }
  function toggleDetails(order: Order) {
    if (expanded === order.id) setExpanded(null);
    else {
      setExpanded(order.id);
      void loadHistory(order);
    }
  }
  async function recordPayment(order: Order, action: "paid" | "refunded") {
    const note = (notes[order.id] || "").trim();
    if (!note || note.length > 200) {
      toast.error(
        "Nhập mã giao dịch hoặc ghi chú đối soát từ 1 đến 200 ký tự.",
      );
      return;
    }
    const confirmation =
      action === "paid"
        ? `Bạn đã kiểm tra và thực sự nhận đủ ${formatPrice(order.total)} cho đơn ${order.reference}? Chỉ xác nhận sau khi đối soát tài khoản ngân hàng hoặc nhận tiền mặt. Thao tác này ghi nhận khoản tiền đã nhận.`
        : `Bạn đã thực sự hoàn trả đủ ${formatPrice(order.total)} cho khách hàng của đơn ${order.reference}? Thao tác này chỉ ghi nhận việc hoàn tiền đã thực hiện, không tự chuyển tiền cho khách.`;
    if (!window.confirm(confirmation)) return;
    setPaymentSaving(order.id);
    try {
      await adminRequest(`/api/admin/orders/${order.id}/payment`, "POST", {
        action,
        note,
      });
      setNotes((previous) => ({ ...previous, [order.id]: "" }));
      toast.success(
        action === "paid"
          ? "Đã ghi nhận tiền thanh toán."
          : "Đã ghi nhận khoản hoàn tiền.",
      );
      startRefresh(() => router.refresh());
      await loadHistory(order);
    } catch (error) {
      reportError(error);
      startRefresh(() => router.refresh());
      await loadHistory(order);
    } finally {
      setPaymentSaving(null);
    }
  }
  async function save(order: Order) {
    const status = drafts[order.id] || order.status;
    if (status === order.status) return;
    if (
      status === "completed" &&
      !window.confirm(
        `Đánh dấu đơn ${order.reference} đã hoàn tất? Trạng thái xử lý không thể thay đổi sau khi hoàn tất. Việc này không xác nhận thanh toán.`,
      )
    )
      return;
    if (
      status === "cancelled" &&
      !window.confirm(
        `Hủy đơn ${order.reference}? Tồn kho sẽ được hoàn lại. Đơn đã hủy không thể mở lại.${order.payment_status === "paid" ? " Đơn đã nhận tiền: hủy đơn không tự hoàn tiền. Sau khi trả tiền thực tế cho khách, cần ghi nhận hoàn tiền riêng." : ""}`,
      )
    )
      return;
    setSaving(order.id);
    try {
      await adminRequest(`/api/admin/orders/${order.id}`, "PATCH", { status });
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[order.id];
        return next;
      });
      toast.success("Đã cập nhật trạng thái đơn hàng.");
      startRefresh(() => router.refresh());
    } catch (error) {
      reportError(error);
      startRefresh(() => router.refresh());
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
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={order.status} />
                  <PaymentBadge status={order.payment_status} />
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 border-t border-[#edf0e7] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleDetails(order)}
                aria-expanded={expanded === order.id}
              >
                <ChevronDown
                  className={`size-4 transition-transform ${expanded === order.id ? "rotate-180" : ""}`}
                />
                {expanded === order.id ? "Ẩn chi tiết" : "Chi tiết đơn hàng"}
              </Button>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-[#788273] lg:block">
                  Xử lý đơn
                </span>
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
                    busy
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
                    busy ||
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
                      Ghi chú của khách hàng
                    </h3>
                    <p className="whitespace-pre-wrap leading-6">
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
                <section className="border-t border-[#dfe5d8] pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">Thanh toán</h3>
                    <PaymentBadge status={order.payment_status} />
                  </div>
                  <p className="mt-3 text-sm">
                    {paymentMethodLabels[order.payment_method]}
                  </p>
                  {order.payment_method === "bank_transfer" && (
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-[#788273]">Ngân hàng của đơn</dt>
                        <dd>
                          {order.payment_bank_name} · {order.payment_bank_bin}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#788273]">
                          Số tài khoản nhận tiền
                        </dt>
                        <dd className="break-all font-medium">
                          {order.payment_bank_account_number}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#788273]">Tên chủ tài khoản</dt>
                        <dd>{order.payment_bank_account_name}</dd>
                      </div>
                      <div>
                        <dt className="text-[#788273]">
                          Nội dung chuyển khoản
                        </dt>
                        <dd className="font-medium">
                          {transferReference(order.reference)}
                        </dd>
                      </div>
                    </dl>
                  )}
                  {order.paid_at && (
                    <p className="mt-3 text-xs text-[#6b7867]">
                      Nhận tiền: {paymentDate(order.paid_at)}
                    </p>
                  )}
                  {order.refunded_at && (
                    <p className="mt-2 text-xs text-[#6b7867]">
                      Hoàn tiền: {paymentDate(order.refunded_at)}
                    </p>
                  )}
                  {order.status === "cancelled" &&
                    order.payment_status === "paid" && (
                      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                        Cần hoàn tiền: đơn đã hủy nhưng đã nhận tiền. Thực hiện
                        hoàn trả cho khách bên ngoài website, rồi ghi nhận khoản
                        hoàn tiền bên dưới.
                      </p>
                    )}
                  {((order.payment_status === "awaiting_payment" &&
                    order.status !== "cancelled") ||
                    (order.payment_status === "paid" &&
                      order.status === "cancelled")) && (
                    <form
                      className="mt-4 space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void recordPayment(
                          order,
                          order.payment_status === "paid" ? "refunded" : "paid",
                        );
                      }}
                    >
                      <Label htmlFor={`payment-note-${order.id}`}>
                        {order.payment_status === "paid"
                          ? "Mã giao dịch hoàn tiền / ghi chú đối soát"
                          : "Mã giao dịch nhận tiền / ghi chú tiền mặt"}
                      </Label>
                      <Input
                        id={`payment-note-${order.id}`}
                        value={notes[order.id] || ""}
                        onChange={(event) =>
                          setNotes((previous) => ({
                            ...previous,
                            [order.id]: event.target.value,
                          }))
                        }
                        required
                        maxLength={200}
                        disabled={busy}
                        placeholder="Ví dụ: mã giao dịch ngân hàng hoặc xác nhận tiền mặt"
                      />
                      <p className="text-xs leading-5 text-[#788273]">
                        Chỉ ghi nhận sau khi kiểm tra tiền thực tế. Không nhập
                        số thẻ, PIN, mật khẩu hay OTP. Trạng thái xử lý đơn được
                        cập nhật riêng.
                      </p>
                      <Button size="sm" disabled={busy}>
                        {paymentSaving === order.id
                          ? "Đang ghi nhận..."
                          : order.payment_status === "paid"
                            ? "Ghi nhận đã hoàn tiền"
                            : "Xác nhận đã nhận đủ tiền"}
                      </Button>
                    </form>
                  )}
                  {order.status === "cancelled" &&
                    order.payment_status === "awaiting_payment" && (
                      <p className="mt-4 text-sm text-[#6b7867]">
                        Đơn đã hủy chưa nhận tiền; không thể ghi nhận thanh
                        toán.
                      </p>
                    )}
                  <div className="mt-5 border-t border-[#dfe5d8] pt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-[#788273]">
                      Lịch sử đối soát
                    </h4>
                    {historyLoading[order.id] ? (
                      <p className="mt-3 text-sm text-[#6b7867]">
                        Đang tải lịch sử...
                      </p>
                    ) : historyErrors[order.id] ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="text-red-700">
                          {historyErrors[order.id]}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void loadHistory(order)}
                        >
                          Thử tải lại
                        </Button>
                      </div>
                    ) : !history[order.id]?.length ? (
                      <p className="mt-3 text-sm text-[#6b7867]">
                        Chưa có ghi nhận tiền thanh toán hoặc hoàn tiền.
                      </p>
                    ) : (
                      <ol className="mt-3 space-y-3 text-sm">
                        {history[order.id].map((entry) => (
                          <li
                            key={entry.id}
                            className="rounded-lg border border-[#dfe5d8] bg-white p-3"
                          >
                            <p className="font-medium">
                              {entry.event === "paid"
                                ? "Đã nhận tiền"
                                : "Đã hoàn tiền"}{" "}
                              · {formatPrice(entry.amount)}
                            </p>
                            <p className="mt-1 text-xs text-[#788273]">
                              {paymentDate(entry.created_at)}
                            </p>
                            <p className="mt-2 break-words whitespace-pre-wrap">
                              {entry.note}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </section>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
