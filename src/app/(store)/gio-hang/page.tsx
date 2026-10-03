import { getSettings } from "@/lib/catalog";
import { CartScreen } from "@/components/store/cart-checkout";
export const metadata = { title: "Giỏ hàng" };
export default async function CartPage() {
  const settings = await getSettings();
  return (
    <main className="mx-auto max-w-6xl px-5 pt-12 sm:px-8">
      <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
        Đã chọn bằng thương yêu
      </p>
      <h1 className="mb-10 font-serif text-5xl tracking-tight text-[#29412d]">
        Giỏ hàng của bạn.
      </h1>
      <CartScreen shippingFee={settings.shipping_fee} />
    </main>
  );
}
