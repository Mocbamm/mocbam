"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  Check,
  LockKeyhole,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { trackStoreEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { money } from "./format";

function EmptyCart() {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <ShoppingBag
        size={42}
        strokeWidth={1}
        className="mx-auto text-[#8d9b7a]"
      />
      <h2 className="mt-6 font-serif text-3xl text-[#29412d]">
        Giỏ hàng đang chờ một chút Mộc.
      </h2>
      <p className="mt-4 text-sm leading-7 text-[#7c866b]">
        Cùng tìm một người bạn nhỏ để mang theo nhé.
      </p>
      <Button asChild className="mt-7">
        <Link href="/san-pham">
          Khám phá sản phẩm <ArrowUpRight size={15} />
        </Link>
      </Button>
    </div>
  );
}
export function CartScreen({ shippingFee }: { shippingFee: number }) {
  const { items, subtotal, ready, update, remove } = useCart();
  if (!ready)
    return (
      <p className="py-20 text-center text-sm text-[#7c866b]">
        Đang mở giỏ hàng...
      </p>
    );
  if (!items.length) return <EmptyCart />;
  return (
    <div className="grid gap-12 md:grid-cols-[1.6fr_1fr]">
      <div>
        {items.map(({ product, quantity }) => (
          <article
            key={product.id}
            className="flex gap-5 border-b border-[#dde1d0] py-6 first:pt-0"
          >
            <Link
              href={`/san-pham/${product.slug}`}
              className="relative h-28 w-28 shrink-0 bg-[#e9ecdf]"
            >
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="112px"
                className="object-cover"
              />
            </Link>
            <div className="flex flex-1 flex-col">
              <div className="flex justify-between gap-4">
                <Link
                  href={`/san-pham/${product.slug}`}
                  className="font-serif text-xl text-[#29412d]"
                >
                  {product.name}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(product.id)}
                  aria-label={`Xóa ${product.name}`}
                  className="self-start text-[#8c947e]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="mt-2 text-xs text-[#7c866b]">
                {money(product.price)}
              </p>
              <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                <div className="flex items-center border border-[#d8ddce]">
                  <button
                    type="button"
                    onClick={() => update(product.id, quantity - 1)}
                    aria-label={`Giảm số lượng ${product.name}`}
                    className="p-2"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="min-w-6 text-center text-xs">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => update(product.id, quantity + 1)}
                    disabled={quantity >= Math.min(product.stock, 10)}
                    aria-label={`Tăng số lượng ${product.name}`}
                    className="p-2 disabled:opacity-30"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <span className="text-sm font-medium text-[#546b43]">
                  {money(product.price * quantity)}
                </span>
              </div>
            </div>
          </article>
        ))}
        <Link
          href="/san-pham"
          className="mt-6 inline-flex items-center gap-3 text-xs underline underline-offset-4"
        >
          Chọn thêm điều nhỏ xinh <ArrowUpRight size={13} />
        </Link>
      </div>
      <aside className="self-start bg-[#edf0e5] p-7">
        <h2 className="font-serif text-2xl text-[#29412d]">
          Một chút tổng kết
        </h2>
        <div className="mt-6 space-y-4 text-sm text-[#778167]">
          <p className="flex justify-between">
            <span>Tạm tính</span>
            <span>{money(subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>Phí giao hàng</span>
            <span>{money(shippingFee)}</span>
          </p>
          <p className="flex justify-between border-t border-[#d1d9c2] pt-5 text-base font-medium text-[#29412d]">
            <span>Tổng dự kiến</span>
            <span>{money(subtotal + shippingFee)}</span>
          </p>
        </div>
        <Button asChild className="mt-6 h-12 w-full">
          <Link href="/thanh-toan">
            Tiếp tục đặt hàng <ArrowUpRight size={15} />
          </Link>
        </Button>
        <p className="mt-4 text-[11px] leading-6 text-[#8b947d]">
          Giá và tồn kho sẽ được kiểm tra lại trước khi tiếp nhận đơn. Website
          hiện chưa thu tiền trực tuyến.
        </p>
      </aside>
    </div>
  );
}
export function CheckoutScreen({
  shippingFee,
  configured,
  initialEmail = "",
}: {
  shippingFee: number;
  configured: boolean;
  initialEmail?: string;
}) {
  const { items, subtotal, ready, clear } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const idempotency = useRef("");
  const submittedDraft = useRef("");
  const started = useRef(false);
  useEffect(() => {
    function startCheckout() {
      if (ready && items.length && !started.current) {
        if (
          trackStoreEvent("begin_checkout", {
            currency: "VND",
            value: subtotal,
            items: items.map(({ product, quantity }) => ({
              item_id: product.id,
              item_name: product.name,
              price: product.price,
              quantity,
            })),
            num_items: items.reduce((s, i) => s + i.quantity, 0),
          })
        )
          started.current = true;
      }
    }
    startCheckout();
    window.addEventListener("mocbam:analytics-ready", startCheckout);
    return () =>
      window.removeEventListener("mocbam:analytics-ready", startCheckout);
  }, [ready, items, subtotal]);
  if (!ready)
    return (
      <p className="py-20 text-center text-sm text-[#7c866b]">
        Đang chuẩn bị đơn hàng...
      </p>
    );
  if (!items.length) return <EmptyCart />;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const draft = {
      items: items.map(({ product, quantity }) => ({
        product_id: product.id,
        quantity,
      })),
      customer: Object.fromEntries(
        ["name", "email", "phone", "address", "city", "note"].map((key) => [
          key,
          String(form.get(key) || "").trim(),
        ]),
      ),
    };
    const fingerprint = JSON.stringify(draft);
    if (!idempotency.current || submittedDraft.current !== fingerprint) {
      idempotency.current = crypto.randomUUID();
      submittedDraft.current = fingerprint;
    }
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          idempotency_key: idempotency.current,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500 && response.status !== 409)
          idempotency.current = "";
        throw new Error(
          result.error || "Chưa thể tiếp nhận đơn. Vui lòng thử lại.",
        );
      }
      if (!result.id || !result.token)
        throw new Error("Phản hồi đơn hàng chưa đầy đủ. Vui lòng liên hệ Mộc.");
      trackStoreEvent("order_submitted", {
        currency: "VND",
        num_items: items.reduce((s, i) => s + i.quantity, 0),
      });
      clear();
      router.push(
        `/don-hang/${encodeURIComponent(result.id)}?token=${encodeURIComponent(result.token)}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Kết nối đang gián đoạn. Bạn có thể thử gửi lại đơn.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-12 md:grid-cols-[1.4fr_1fr]">
      <div>
        {!configured ? (
          <div
            role="status"
            className="mb-7 border border-[#d9ca9d] bg-[#f3eddb] p-5 text-sm leading-7 text-[#7a6840]"
          >
            <strong className="block">Bạn đang xem bản trình diễn.</strong>Cửa
            hàng chưa kết nối cơ sở dữ liệu, nên chưa tiếp nhận đơn hàng. Bạn có
            thể trải nghiệm giỏ hàng và biểu mẫu; nút gửi đơn sẽ hoạt động sau
            khi cấu hình Supabase.
          </div>
        ) : null}
        <h2 className="mb-6 font-serif text-2xl text-[#29412d]">
          Gửi đến đâu, bạn nhỉ?
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="checkout-name">Họ và tên *</Label>
            <Input
              id="checkout-name"
              name="name"
              autoComplete="name"
              required
              maxLength={100}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="checkout-phone">Số điện thoại *</Label>
            <Input
              id="checkout-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              minLength={7}
              maxLength={30}
              pattern="[+0-9().\s\-]{7,30}"
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="checkout-email">Email *</Label>
            <Input
              id="checkout-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              defaultValue={initialEmail}
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="checkout-address">Địa chỉ nhận hàng *</Label>
            <Input
              id="checkout-address"
              name="address"
              autoComplete="street-address"
              required
              maxLength={500}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="checkout-city">Tỉnh / thành phố *</Label>
            <Input
              id="checkout-city"
              name="city"
              autoComplete="address-level1"
              required
              maxLength={100}
              className="mt-2"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="checkout-note">Lời nhắn cho Mộc</Label>
            <Textarea
              id="checkout-note"
              name="note"
              maxLength={1000}
              placeholder="Bạn muốn nhắn thêm điều gì về đơn hàng?"
              className="mt-2 min-h-24"
            />
          </div>
        </div>
        <div className="mt-8 border-t border-[#dde1d0] pt-6">
          <h2 className="font-serif text-2xl text-[#29412d]">Về thanh toán</h2>
          <p className="mt-4 flex items-center gap-2 text-xs font-medium text-[#60754f]">
            <Check size={15} /> Gửi đơn để Mộc xác nhận
          </p>
          <p className="mt-3 text-sm leading-7 text-[#7c866b]">
            Website chưa có cổng thu tiền trực tuyến. Đơn được lưu ở trạng thái{" "}
            <strong>chờ thanh toán</strong>; Mộc sẽ liên hệ để xác nhận thông
            tin trước khi xử lý.
          </p>
        </div>
      </div>
      <aside className="self-start bg-[#edf0e5] p-7">
        <h2 className="font-serif text-2xl text-[#29412d]">
          Những điều bạn chọn
        </h2>
        <div className="mt-5 space-y-4">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 text-xs">
                <p>{product.name}</p>
                <p className="mt-1 text-[#8b947d]">Số lượng: {quantity}</p>
              </div>
              <span className="text-xs">{money(product.price * quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-7 space-y-3 border-t border-[#d1d9c2] pt-5 text-xs text-[#778167]">
          <p className="flex justify-between">
            <span>Tạm tính</span>
            <span>{money(subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>Phí giao hàng</span>
            <span>{money(shippingFee)}</span>
          </p>
          <p className="flex justify-between border-t border-[#d1d9c2] pt-5 text-base font-medium text-[#29412d]">
            <span>Tổng dự kiến</span>
            <span>{money(subtotal + shippingFee)}</span>
          </p>
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-5 border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-700"
          >
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={busy || !configured}
          className="mt-6 h-12 w-full"
        >
          {busy ? "Đang gửi đơn..." : "Gửi đơn hàng"}
          <ArrowUpRight size={15} />
        </Button>
        <p className="mt-4 text-[10px] leading-6 text-[#8b947d]">
          Khi gửi đơn, bạn đồng ý với{" "}
          <Link href="/chinh-sach" className="underline">
            chính sách của Mộc Bàm
          </Link>
          . Giá cuối cùng được xác nhận bằng dữ liệu trên hệ thống.
        </p>
        <p className="mt-4 flex items-center justify-center gap-2 text-[10px] text-[#8b947d]">
          <LockKeyhole size={12} /> Thông tin dùng để xử lý đơn hàng
        </p>
      </aside>
    </form>
  );
}
