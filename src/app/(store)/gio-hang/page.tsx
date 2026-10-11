import { getSettings } from "@/lib/catalog";
import { CartScreen } from "@/components/store/cart-checkout";
export const metadata = { title: "Giỏ hàng" };
export default async function CartPage() {
  const settings = await getSettings();
  return (
    <div className="store-page store-cart-page">
      <p className="store-eyebrow">Đã chọn bằng thương yêu</p>
      <h1 className="store-page-title mb-10">Giỏ hàng của bạn.</h1>
      <CartScreen shippingFee={settings.shipping_fee} />
    </div>
  );
}
