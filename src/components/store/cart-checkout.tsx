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
  Truck,
  Landmark,
  LockKeyhole,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { checkoutAnalytics, trackStoreEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { money } from "./format";
import { AddressFields } from "./address-fields";
import { saveOrderReceipt } from "@/lib/saved-orders";
import {
  checkoutAddress,
  quoteShipping,
  type ShippingZone,
  type ShippingDistanceQuote,
} from "@/lib/shipping";

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
        {items.map(({ product, quantity, key }) => (
          <article
            key={key}
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
                  onClick={() => remove(key)}
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
                    onClick={() => update(key, quantity - 1)}
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
                    onClick={() => update(key, quantity + 1)}
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
            <span>Phí giao hàng dự kiến</span>
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
          Phí giao hàng được cập nhật theo địa chỉ ở bước đặt hàng. Giá và tồn
          kho sẽ được kiểm tra lại trước khi tiếp nhận đơn.
        </p>
      </aside>
    </div>
  );
}
export function CheckoutScreen({
  shippingFee,
  shippingZones = [],
  shippingDistanceEnabled = false,
  configured,
  bankTransferAvailable,
  initialEmail = "",
  initialName = "",
  initialPhone = "",
  signedIn = false,
}: {
  shippingFee: number;
  shippingZones?: ShippingZone[];
  shippingDistanceEnabled?: boolean;
  configured: boolean;
  bankTransferAvailable: boolean;
  initialEmail?: string;
  initialName?: string;
  initialPhone?: string;
  signedIn?: boolean;
}) {
  const { items, subtotal, ready, clear } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState({
    province: "",
    ward: "",
    address: "",
  });
  const [distanceResult, setDistanceResult] = useState<{
    key: string;
    quote?: ShippingDistanceQuote;
    error?: string;
  } | null>(null);
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  const addressKey = JSON.stringify(
    checkoutAddress(
      destination.address,
      destination.province,
      destination.ward,
    ),
  );
  const addressComplete = Boolean(
    destination.address.trim() &&
      destination.province.trim() &&
      destination.ward.trim(),
  );
  const distanceQuote =
    distanceResult?.key === addressKey ? distanceResult.quote : undefined;
  const distanceError =
    distanceResult?.key === addressKey ? distanceResult.error : undefined;
  const distanceReady = !shippingDistanceEnabled || Boolean(distanceQuote);
  useEffect(() => {
    if (!shippingDistanceEnabled || !addressComplete) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: addressKey,
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Chưa thể tính phí giao hàng.");
        if (!controller.signal.aborted)
          setDistanceResult({ key: addressKey, quote: result.data });
      } catch (cause) {
        if (!controller.signal.aborted)
          setDistanceResult({
            key: addressKey,
            error:
              cause instanceof Error
                ? cause.message
                : "Chưa thể tính phí giao hàng.",
          });
      }
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [addressKey, addressComplete, shippingDistanceEnabled, quoteRefresh]);
  useEffect(() => {
    if (!distanceQuote) return;
    const timer = setTimeout(
      () => {
        setDistanceResult(null);
        setQuoteRefresh((value) => value + 1);
      },
      Math.max(1000, Date.parse(distanceQuote.expires_at) - Date.now() - 10000),
    );
    return () => clearTimeout(timer);
  }, [distanceQuote]);
  const shipping =
    distanceQuote ||
    quoteShipping(
      shippingFee,
      shippingZones,
      destination.province,
      destination.ward,
    );
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank_transfer">(
    "cod",
  );
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<{
    code: string;
    title: string;
    discount_amount: number;
    subtotal: number;
    cart_fingerprint: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const cartFingerprint = JSON.stringify(
    items
      .map(({ product, variant_id, quantity }) => ({
        product_id: product.id,
        variant_id: variant_id || "",
        quantity,
      }))
      .sort((a, b) =>
        `${a.product_id}:${a.variant_id}`.localeCompare(
          `${b.product_id}:${b.variant_id}`,
        ),
      ),
  );
  const effectiveDiscount =
    discount &&
    discount.subtotal === subtotal &&
    discount.cart_fingerprint === cartFingerprint &&
    discount.code === discountCode.trim().toUpperCase()
      ? discount
      : null;
  const idempotency = useRef("");
  const submittedDraft = useRef("");
  const started = useRef(false);
  async function applyDiscount() {
    if (busy || quoting || !configured || !discountCode.trim()) return;
    setQuoting(true);
    setDiscountError("");
    setDiscount(null);
    try {
      const response = await fetch("/api/discounts/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountCode,
          items: items.map(({ product, quantity, variant_id }) => ({
            product_id: product.id,
            ...(variant_id ? { variant_id } : {}),
            quantity,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDiscountCode(result.code);
      setDiscount({ ...result, cart_fingerprint: cartFingerprint });
    } catch (cause) {
      setDiscountError(
        cause instanceof Error ? cause.message : "Chưa thể kiểm tra ưu đãi.",
      );
    } finally {
      setQuoting(false);
    }
  }
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
    if (busy || quoting || !configured || !distanceReady) return;
    if (
      shippingDistanceEnabled &&
      distanceQuote &&
      Date.parse(distanceQuote.expires_at) <= Date.now()
    ) {
      setDistanceResult(null);
      setQuoteRefresh((value) => value + 1);
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const draft = {
      payment_method: paymentMethod,
      discount_code: effectiveDiscount?.code || "",
      items: items.map(({ product, quantity, variant_id }) => ({
        product_id: product.id,
        ...(variant_id ? { variant_id } : {}),
        quantity,
      })),
      customer: Object.fromEntries(
        ["name", "email", "phone", "address", "city", "ward", "note"].map(
          (key) => [key, String(form.get(key) || "").trim()],
        ),
      ),
    };
    draft.customer.address = [
      draft.customer.address,
      String(form.get("ward") || "").trim(),
    ]
      .filter(Boolean)
      .join(", ");
    const fingerprint = JSON.stringify(draft);
    if (!idempotency.current || submittedDraft.current !== fingerprint) {
      idempotency.current = crypto.randomUUID();
      submittedDraft.current = fingerprint;
    }
    try {
      const analytics = await checkoutAnalytics();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          idempotency_key: idempotency.current,
          ...(shippingDistanceEnabled && distanceQuote
            ? { shipping_quote_id: distanceQuote.id }
            : {}),
          ...(analytics ? { analytics } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 && shippingDistanceEnabled) {
          setDistanceResult(null);
          setQuoteRefresh((value) => value + 1);
        }
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
      saveOrderReceipt({
        id: result.id,
        token: result.token,
        reference: result.reference,
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
    <form
      onSubmit={submit}
      className="grid gap-12 md:grid-cols-[1.4fr_1fr]"
    >
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
        {!signedIn ? (
          <p className="mb-6 text-xs leading-6 text-[#7c866b]">
            Bạn đang đặt hàng với tư cách khách.{" "}
            <Link href="/tai-khoan?next=/thanh-toan" className="underline">
              Đăng nhập
            </Link>{" "}
            để lưu đơn trong tài khoản. Bạn vẫn có thể theo dõi bằng liên kết
            riêng sau khi đặt.
          </p>
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
              defaultValue={initialName}
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
              defaultValue={initialPhone}
              type="tel"
              autoComplete="tel"
              required
              minLength={7}
              maxLength={30}
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
          <AddressFields onChange={setDestination} />
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
        <fieldset
          disabled={busy}
          className="mt-8 border-t border-[#dde1d0] pt-6"
        >
          <legend className="pt-6 font-serif text-2xl text-[#29412d]">
            Bạn muốn thanh toán thế nào?
          </legend>
          <div className="mt-4 space-y-3">
            <label
              className={`flex cursor-pointer items-start gap-3 border p-5 ${paymentMethod === "cod" ? "border-[#70865c] bg-[#edf0e5]" : "border-[#dde1d0]"}`}
            >
              <input
                type="radio"
                name="payment_method"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
                className="mt-1 h-4 w-4 shrink-0 accent-[#546b43]"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium text-[#29412d]">
                  <Truck size={17} strokeWidth={1.5} /> Thanh toán khi nhận hàng
                  (COD)
                </span>
                <span className="mt-2 block text-xs leading-6 text-[#7c866b]">
                  Trả tiền cho nhân viên giao hàng khi nhận được đơn. Mộc sẽ xác
                  nhận đơn trước khi gửi.
                </span>
              </span>
            </label>
            {bankTransferAvailable ? (
              <label
                className={`flex cursor-pointer items-start gap-3 border p-5 ${paymentMethod === "bank_transfer" ? "border-[#70865c] bg-[#edf0e5]" : "border-[#dde1d0]"}`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="bank_transfer"
                  checked={paymentMethod === "bank_transfer"}
                  onChange={() => setPaymentMethod("bank_transfer")}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#546b43]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-[#29412d]">
                    <Landmark size={17} strokeWidth={1.5} /> Chuyển khoản ngân
                    hàng
                  </span>
                  <span className="mt-2 block text-xs leading-6 text-[#7c866b]">
                    Thông tin nhận tiền và mã QR sẽ xuất hiện sau khi đặt đơn.
                    Mộc kiểm tra giao dịch rồi xác nhận thanh toán thủ công.
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-xs leading-6 text-[#7c866b]">
                Chuyển khoản sẽ được mở khi cửa hàng cập nhật tài khoản nhận
                tiền.
              </p>
            )}
          </div>
          <p className="mt-4 text-xs leading-6 text-[#7c866b]">
            Gửi đơn chưa xác nhận đã thanh toán. Trạng thái sẽ cập nhật khi Mộc
            xác nhận đã nhận tiền.
          </p>
        </fieldset>
      </div>
      <aside className="self-start bg-[#edf0e5] p-7">
        <h2 className="font-serif text-2xl text-[#29412d]">
          Những điều bạn chọn
        </h2>
        <div className="mt-5 space-y-4">
          {items.map(({ product, quantity, key }) => (
            <div key={key} className="flex items-center gap-3">
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
        <div className="mt-7 border-t border-[#d1d9c2] pt-5">
          <Label htmlFor="checkout-discount">Mã ưu đãi</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="checkout-discount"
              value={discountCode}
              maxLength={40}
              disabled={busy || quoting}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void applyDiscount();
                }
              }}
              onChange={(e) => {
                setDiscountCode(e.target.value);
                setDiscount(null);
                setDiscountError("");
              }}
              placeholder="Nhập mã ưu đãi"
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy || !configured || quoting || !discountCode.trim()}
              onClick={applyDiscount}
            >
              {quoting ? "Đang kiểm tra..." : "Áp dụng"}
            </Button>
          </div>
          {discountError ? (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {discountError}
            </p>
          ) : null}
          {effectiveDiscount ? (
            <p role="status" className="mt-2 text-xs text-[#406344]">
              {effectiveDiscount.title} · Giảm{" "}
              {money(effectiveDiscount.discount_amount)}{" "}
              <button
                type="button"
                onClick={() => {
                  setDiscount(null);
                  setDiscountCode("");
                }}
                className="ml-2 underline"
              >
                Bỏ mã
              </button>
            </p>
          ) : null}
        </div>
        <div className="mt-7 space-y-3 border-t border-[#d1d9c2] pt-5 text-xs text-[#778167]">
          <p className="flex justify-between">
            <span>Tạm tính</span>
            <span>{money(subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>
              {destination.province && destination.ward
                ? "Phí giao hàng"
                : "Phí giao hàng dự kiến"}
              {destination.province &&
              (!shippingDistanceEnabled || distanceQuote)
                ? ` · ${shipping.name}`
                : " (chọn địa chỉ để tính)"}
            </span>
            <span>
              {shippingDistanceEnabled && !distanceQuote
                ? "Chờ tính phí"
                : money(shipping.fee)}
            </span>
          </p>
          {shippingDistanceEnabled ? (
            <div className="space-y-2" aria-live="polite">
              <p>
                {distanceQuote
                  ? `${(distanceQuote.distance_meters / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} km đường bộ từ cửa hàng.`
                  : !addressComplete
                    ? "Điền đủ địa chỉ để tự động tính phí theo km."
                    : distanceError ||
                      "Đang tính khoảng cách và phí giao hàng..."}
              </p>
              <p>
                Địa chỉ giao hàng được gửi tới Google Maps để tính quãng đường.
              </p>
              {distanceError ? (
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setDistanceResult(null);
                    setQuoteRefresh((value) => value + 1);
                  }}
                >
                  Tính lại phí
                </button>
              ) : null}
            </div>
          ) : null}
          {effectiveDiscount ? (
            <p className="flex justify-between">
              <span>Ưu đãi ({effectiveDiscount.code})</span>
              <span>−{money(effectiveDiscount.discount_amount)}</span>
            </p>
          ) : null}
          <p className="flex justify-between border-t border-[#d1d9c2] pt-5 text-base font-medium text-[#29412d]">
            <span>Tổng dự kiến</span>
            <span>
              {shippingDistanceEnabled && !distanceQuote
                ? "Chờ tính phí giao hàng"
                : money(
                    subtotal +
                      shipping.fee -
                      (effectiveDiscount?.discount_amount || 0),
                  )}
            </span>
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
          disabled={busy || quoting || !configured || !distanceReady}
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
