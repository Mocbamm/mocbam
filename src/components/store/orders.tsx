"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Package, ArrowUpRight, RefreshCw } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { money, dateLabel } from "./format";
export const statusLabels: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang chuẩn bị",
  shipped: "Đang giao hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
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
          <Check size={24} strokeWidth={1.5} />
        </span>
        <p className="mt-6 text-[10px] uppercase tracking-[0.2em] text-[#889777]">
          Đơn hàng {order.reference}
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-[#29412d] sm:text-5xl">
          Mộc đã nhận lời nhắn của bạn.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-[#7c866b]">
          Cảm ơn bạn đã chọn một chút Mộc. Đơn đang chờ xác nhận và{" "}
          <strong>chưa được thanh toán</strong>. Cửa hàng sẽ trao đổi trước khi
          xử lý.
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
          <dl className="mt-5 space-y-5 text-sm">
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-[#859174]">
                Trạng thái
              </dt>
              <dd className="mt-2">{statusLabels[order.status]}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-[#859174]">
                Thanh toán
              </dt>
              <dd className="mt-2">Chờ thanh toán · chưa thu tiền</dd>
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
      <div className="mt-8 text-center">
        <Button asChild variant="outline">
          <Link href="/san-pham">
            Ghé Mộc thêm một chút <ArrowUpRight size={15} />
          </Link>
        </Button>
      </div>
    </>
  );
}
export function AccountOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      try {
        const response = await fetch("/api/account/orders", {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Chưa thể xem đơn hàng.");
        setOrders(result.orders || []);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Lỗi kết nối.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void read();
    return () => controller.abort();
  }, []);
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
          Những đơn đặt khi đăng nhập sẽ xuất hiện tại đây.
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
            </span>
            <span>{money(order.total)}</span>
          </summary>
          <div className="mt-5 border-t border-[#dde1d0] pt-3">
            <OrderLines order={order} />
            <p className="mt-5 text-xs text-[#7c866b]">
              Giao đến: {order.address}, {order.city}
            </p>
            <p className="mt-2 text-xs text-[#7c866b]">
              Thanh toán: chờ thanh toán.
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
