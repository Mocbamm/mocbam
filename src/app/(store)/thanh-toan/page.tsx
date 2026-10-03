import { getSettings, isConfigured } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutScreen } from "@/components/store/cart-checkout";
export const metadata = {
  title: "Đặt hàng",
  robots: { index: false, follow: false },
};
export default async function CheckoutPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  return (
    <main className="mx-auto max-w-6xl px-5 pt-12 sm:px-8">
      <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
        Một chút Mộc sắp đến với bạn
      </p>
      <h1 className="mb-10 font-serif text-5xl tracking-tight text-[#29412d]">
        Gửi thương, nhận Mộc.
      </h1>
      <CheckoutScreen
        shippingFee={settings.shipping_fee}
        configured={isConfigured()}
        initialEmail={user?.email || ""}
      />
    </main>
  );
}
