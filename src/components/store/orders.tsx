"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Package, ArrowUpRight, RefreshCw, X } from "lucide-react";
import type { BankTransfer, Order, OrderStatus } from "@/lib/types";
import {
  paymentMethodLabels,
  paymentStatusLabels,
  transferReference,
} from "@/lib/payments";
import { Button } from "@/components/ui/button";
import { money, dateLabel } from "./format";
import { readSavedOrders, saveOrderReceipt } from "@/lib/saved-orders";
export const statusLabels: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang chuẩn bị",
  shipped: "Đang giao hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
function PaymentDetails({
  order,
  transfer,
}: {
  order: Order;
  transfer?: BankTransfer | null;
}) {
  const cancelled = order.status === "cancelled";
  const paid = order.payment_status === "paid";
  const refunded = order.payment_status === "refunded";
  const showBankInstructions =
    order.payment_method === "bank_transfer" &&
    order.total > 0 &&
    !cancelled &&
    !paid &&
    !refunded;
  const bank = showBankInstructions
    ? transfer ||
      (order.payment_bank_name &&
      order.payment_bank_account_number &&
      order.payment_bank_account_name
        ? {
            bankName: order.payment_bank_name,
            accountNumber: order.payment_bank_account_number,
            accountName: order.payment_bank_account_name,
            amount: order.total,
            reference: transferReference(order.reference),
            qrDataUrl: null,
          }
        : null)
    : null;
  return (
    <section className="bg-[#edf0e5] p-5 sm:p-7">
      <h2 className="font-serif text-2xl text-[#29412d]">
        Thanh toán đơn hàng
      </h2>
      <dl className="mt-5 flex flex-wrap gap-x-12 gap-y-4 text-sm">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-[#859174]">
            Phương thức
          </dt>
          <dd className="mt-2 font-medium text-[#29412d]">
            {paymentMethodLabels[order.payment_method]}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-[#859174]">
            Trạng thái thanh toán
          </dt>
          <dd className="mt-2 font-medium text-[#29412d]">
            {paymentStatusLabels[order.payment_status]}
          </dd>
        </div>
      </dl>
      {order.total === 0 ? (
        <p className="mt-5 text-sm leading-7 text-[#60754f]">
          Đơn hàng này có tổng tiền 0₫. Bạn không cần thanh toán hoặc chuyển
          khoản.
        </p>
      ) : refunded ? (
        <p className="mt-5 text-sm leading-7 text-[#60754f]">
          Mộc đã xác nhận hoàn tiền
          {order.refunded_at ? ` vào ${dateLabel(order.refunded_at)}` : ""}. Nếu
          bạn cần đối soát giao dịch, hãy liên hệ cửa hàng với mã đơn{" "}
          {order.reference}.
        </p>
      ) : cancelled && paid ? (
        <p role="status" className="mt-5 text-sm leading-7 text-[#847044]">
          Đơn đã hủy nhưng đã thanh toán. Cửa hàng cần xử lý hoàn tiền thủ công;
          trạng thái sẽ được cập nhật sau khi tiền đã được hoàn. Vui lòng liên
          hệ Mộc với mã đơn {order.reference} để đối soát.
        </p>
      ) : paid ? (
        <p className="mt-5 text-sm leading-7 text-[#60754f]">
          Mộc đã xác nhận nhận đủ tiền
          {order.paid_at ? ` vào ${dateLabel(order.paid_at)}` : ""}. Bạn không
          cần thanh toán lại cho đơn này.
        </p>
      ) : cancelled ? (
        <p className="mt-5 text-sm leading-7 text-[#7c866b]">
          Bạn không cần thanh toán cho đơn đã hủy.
          {order.payment_method === "bank_transfer"
            ? " Vui lòng không chuyển tiền. Nếu bạn đã chuyển trước khi đơn bị hủy, hãy liên hệ Mộc để đối soát và xử lý hoàn tiền."
            : ""}
        </p>
      ) : order.payment_method === "cod" ? (
        <p className="mt-5 text-sm leading-7 text-[#7c866b]">
          Thanh toán{" "}
          <strong className="text-[#29412d]">{money(order.total)}</strong> cho
          nhân viên giao hàng khi nhận được đơn. Trạng thái sẽ được cập nhật khi
          Mộc xác nhận đã thu tiền.
        </p>
      ) : showBankInstructions ? (
        bank ? (
          <div className="mt-6 grid gap-7 border-t border-[#d4dcc7] pt-6 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <p className="text-sm leading-7 text-[#7c866b]">
                Chuyển đúng số tiền và nội dung bên dưới để Mộc đối soát đơn.
                Thông tin nhận tiền được lưu theo đơn hàng này.
              </p>
              <dl className="mt-5 space-y-4 text-sm">
                {[
                  ["Ngân hàng", bank.bankName],
                  ["Số tài khoản", bank.accountNumber],
                  ["Chủ tài khoản", bank.accountName],
                  ["Số tiền", money(bank.amount)],
                  ["Nội dung chuyển khoản", bank.reference],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-[#7c866b]">{label}</dt>
                    <dd className="mt-1 break-words font-medium text-[#29412d]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-xs leading-6 text-[#7c866b]">
                Chuyển khoản không tự đổi trạng thái thanh toán. Mộc sẽ kiểm tra
                tiền vào tài khoản và xác nhận thủ công. Nếu đã chuyển mà chưa
                thấy cập nhật, hãy liên hệ cửa hàng với mã đơn {order.reference}
                .
              </p>
            </div>
            {bank.qrDataUrl ? (
              <div className="self-start text-center">
                <Image
                  src={bank.qrDataUrl}
                  alt={`Mã QR chuyển khoản cho đơn ${order.reference}`}
                  width={224}
                  height={224}
                  unoptimized
                  className="mx-auto h-56 w-56 border border-[#d4dcc7] bg-white p-3"
                />
                <p className="mt-3 text-[11px] text-[#7c866b]">
                  Quét bằng ứng dụng ngân hàng
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p role="status" className="mt-5 text-sm leading-7 text-[#7c866b]">
            Chưa mở được thông tin nhận tiền của đơn. Vui lòng liên hệ Mộc với
            mã đơn {order.reference} trước khi chuyển khoản.
          </p>
        )
      ) : (
        <p className="mt-5 text-sm leading-7 text-[#7c866b]">
          Đơn này chưa chọn phương thức thanh toán. Vui lòng liên hệ Mộc với mã
          đơn {order.reference} để được hướng dẫn.
        </p>
      )}
      <Link
        href="/lien-he"
        className="mt-5 inline-flex items-center gap-2 text-xs underline underline-offset-4"
      >
        Liên hệ về đơn hàng <ArrowUpRight size={13} />
      </Link>
    </section>
  );
}
function OrderLines({ order }: { order: Order }) {
  return (
    <>
      <div className="divide-y divide-[#dde1d0]">
        {order.items?.map((item) => (
          <div
            key={item.id || item.product_id}
            className="flex justify-between gap-5 py-4 text-sm"
          >
            <span>
              {item.name}{" "}
              <span className="ml-2 text-xs text-[#8b947d]">
                × {item.quantity}
              </span>
            </span>
            <span>{money(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-3 border-t border-[#dde1d0] pt-4 text-xs text-[#7c866b]">
        <p className="flex justify-between">
          <span>Tạm tính</span>
          <span>{money(order.subtotal)}</span>
        </p>
        <p className="flex justify-between">
          <span>Phí giao hàng</span>
          <span>{money(order.shipping_fee)}</span>
        </p>
        {order.discount_amount ? (
          <p className="flex justify-between text-[#406344]">
            <span>Ưu đãi {order.discount_code}</span>
            <span>−{money(order.discount_amount)}</span>
          </p>
        ) : null}
        <p className="flex justify-between pt-2 text-base text-[#29412d]">
          <strong>Tổng đơn hàng</strong>
          <strong>{money(order.total)}</strong>
        </p>
      </div>
    </>
  );
}
export function ReceiptScreen({ id, token }: { id: string; token: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [transfer, setTransfer] = useState<BankTransfer | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      try {
        const response = await fetch(
          `/api/orders/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Không thể xem đơn hàng.");
        setOrder(result.order);
        saveOrderReceipt({ id, token, reference: result.order.reference });
        setTransfer(result.transfer || null);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Kết nối đang gián đoạn.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    if (token) void read();
    return () => controller.abort();
  }, [id, token, reload]);
  if (!token)
    return (
      <p role="alert" className="py-20 text-center text-sm text-[#7c866b]">
        Liên kết thiếu mã bảo mật. Vui lòng mở lại liên kết sau khi đặt hàng.
      </p>
    );
  if (loading)
    return (
      <p className="py-20 text-center text-sm text-[#7c866b]">
        Đang kiểm tra đơn hàng của bạn...
      </p>
    );
  if (error || !order)
    return (
      <div className="mx-auto max-w-lg border border-[#dde1d0] p-8 text-center">
        <h1 className="font-serif text-3xl text-[#29412d]">
          Chưa mở được đơn hàng
        </h1>
        <p role="alert" className="mt-4 text-sm leading-7 text-[#7c866b]">
          {error || "Không tìm thấy đơn hàng."}
        </p>
        <Button
          className="mt-5"
          variant="outline"
          onClick={() => (
            setLoading(true),
            setError(""),
            setReload((v) => v + 1)
          )}
        >
          <RefreshCw size={14} /> Thử lại
        </Button>
        <Link href="/lien-he" className="ml-4 text-xs underline">
          Liên hệ Mộc
        </Link>
      </div>
    );
  return (
    <>
      <div className="mb-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e5ecda] text-[#456237]">
          {order.status === "cancelled" ? (
            <X size={24} strokeWidth={1.5} />
          ) : (
            <Check size={24} strokeWidth={1.5} />
          )}
        </span>
        <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-[#889777]">
          Đơn hàng {order.reference}
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-[#29412d] sm:text-5xl">
          {order.status === "cancelled"
            ? "Đơn hàng đã được hủy."
            : order.payment_status === "refunded"
              ? "Mộc đã xác nhận hoàn tiền."
              : order.payment_status === "paid"
                ? "Mộc đã xác nhận thanh toán."
                : "Mộc đã nhận đơn hàng của bạn."}
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#7c866b]">
          Trạng thái xử lý: <strong>{statusLabels[order.status]}</strong>. Thanh
          toán: <strong>{paymentStatusLabels[order.payment_status]}</strong>.
          Bạn có thể cập nhật trạng thái để xem thông tin mới nhất từ Mộc.
        </p>
      </div>
      <div className="grid gap-7 md:grid-cols-2">
        <section className="border border-[#dde1d0] p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-serif text-2xl text-[#29412d]">
              Những điều đã chọn
            </h2>
            <Package size={18} strokeWidth={1.4} />
          </div>
          <OrderLines order={order} />
        </section>
        <section className="bg-[#edf0e5] p-7">
          <h2 className="font-serif text-2xl text-[#29412d]">
            Hành trình của đơn
          </h2>
          <OrderProgress status={order.status} />
          <dl className="mt-5 space-y-5 text-sm">
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-[#859174]">
                Trạng thái
              </dt>
              <dd className="mt-2">{statusLabels[order.status]}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-[#859174]">
                Gửi đến
              </dt>
              <dd className="mt-2 leading-7">
                {order.customer_name}
                <br />
                {order.address}, {order.city}
                <br />
                {order.phone}
              </dd>
            </div>
            {order.note ? (
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-[#859174]">
                  Lời nhắn
                </dt>
                <dd className="mt-2 leading-7">{order.note}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-6 border-t border-[#d4dcc7] pt-4 text-[11px] leading-6 text-[#8b947d]">
            Lưu liên kết này để xem lại đơn hàng. Liên kết chứa mã riêng, chỉ
            chia sẻ với người bạn tin cậy.
          </p>
          <button
            type="button"
            onClick={() => (
              setLoading(true),
              setError(""),
              setReload((v) => v + 1)
            )}
            className="mt-3 flex items-center gap-2 text-xs underline underline-offset-4"
          >
            <RefreshCw size={12} /> Cập nhật trạng thái
          </button>
        </section>
      </div>
      <div className="mt-7">
        <PaymentDetails order={order} transfer={transfer} />
      </div>
      <div className="mt-8 text-center">
        <Button asChild className="mb-4 mr-3">
          <Link href="/tai-khoan">Đơn hàng của tôi</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/san-pham">
            Ghé Mộc thêm một chút <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
    </>
  );
}
export function AccountOrders({ signedIn = true }: { signedIn?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      try {
        const response = signedIn
          ? await fetch("/api/account/orders", {
              signal: controller.signal,
              cache: "no-store",
            })
          : null;
        const result = response ? await response.json() : { orders: [] };
        if (response && !response.ok)
          throw new Error(result.error || "Chưa thể xem đơn hàng.");
        const accountOrders: Order[] = result.orders || [];
        const known = new Set(accountOrders.map((o) => o.id));
        const receipts = readSavedOrders().filter((o) => !known.has(o.id));
        const recovered = await Promise.all(
          receipts.map(async (r) => {
            try {
              const reply = await fetch(
                `/api/orders/${encodeURIComponent(r.id)}?token=${encodeURIComponent(r.token)}`,
                { signal: controller.signal, cache: "no-store" },
              );
              return reply.ok ? ((await reply.json()).order as Order) : null;
            } catch {
              return null;
            }
          }),
        );
        setOrders(
          [
            ...accountOrders,
            ...recovered.filter((o): o is Order => o !== null),
          ].sort((a, b) => b.created_at.localeCompare(a.created_at)),
        );
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Lỗi kết nối.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void read();
    return () => controller.abort();
  }, [signedIn, reload]);
  if (loading)
    return (
      <p className="py-8 text-sm text-[#7c866b]">
        Đang tìm những đơn hàng của bạn...
      </p>
    );
  if (error)
    return (
      <p role="alert" className="py-8 text-sm text-red-700">
        {error}
      </p>
    );
  if (!orders.length)
    return (
      <div className="bg-[#edf0e5] p-8">
        <p className="font-serif text-2xl text-[#29412d]">
          Bạn chưa có đơn hàng nào.
        </p>
        <p className="mt-3 text-sm text-[#7c866b]">
          Đơn đặt khi đăng nhập và đơn dùng email đã xác nhận sẽ xuất hiện tại
          đây. Đơn khách trên thiết bị này được lưu bằng liên kết riêng.
        </p>
        <Link
          href="/san-pham"
          className="mt-5 inline-flex items-center gap-2 text-xs underline underline-offset-4"
        >
          Tìm người bạn nhỏ <ArrowUpRight size={13} />
        </Link>
      </div>
    );
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setLoading(true);
          setError("");
          setReload((v) => v + 1);
        }}
        className="flex items-center gap-2 text-xs underline underline-offset-4"
      >
        <RefreshCw size={13} />
        Cập nhật đơn hàng
      </button>
      {orders.map((order) => (
        <details key={order.id} className="border border-[#dde1d0] p-5">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-4 text-sm">
            <span>
              <strong className="font-medium">{order.reference}</strong>
              <span className="mt-1 block text-xs text-[#8b947d]">
                {dateLabel(order.created_at)}
              </span>
            </span>
            <span className="text-xs text-[#657957]">
              {statusLabels[order.status]}
              <span className="mt-1 block text-[#8b947d]">
                {paymentStatusLabels[order.payment_status]}
              </span>
            </span>
            <span>{money(order.total)}</span>
          </summary>
          <div className="mt-5 border-t border-[#dde1d0] pt-3">
            <OrderLines order={order} />
            <p className="mt-5 text-xs text-[#7c866b]">
              Giao đến: {order.address}, {order.city}
            </p>
            <OrderProgress status={order.status} />
            <div className="mt-5">
              <PaymentDetails order={order} />
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}
export function OrderProgress({ status }: { status: OrderStatus }) {
  const steps: OrderStatus[] = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "completed",
  ];
  if (status === "cancelled")
    return <p className="mt-6 text-sm">Đơn hàng đã hủy.</p>;
  return (
    <ol
      aria-label="Tiến trình đơn hàng"
      className="my-6 grid gap-3 sm:grid-cols-5"
    >
      {steps.map((step, i) => (
        <li
          key={step}
          aria-current={status === step ? "step" : undefined}
          className={`border-t-2 pt-3 text-xs ${i <= steps.indexOf(status) ? "border-[#406344] text-[#29412d]" : "border-[#d7ddcd] text-[#7c866b]"}`}
        >
          <span className="mr-2">
            {i < steps.indexOf(status) ? "✓" : i + 1}
          </span>
          {statusLabels[step]}
        </li>
      ))}
    </ol>
  );
}
