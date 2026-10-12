import { getSettings, isConfigured } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/customer-profile";
import { isBankTransferAvailable } from "@/lib/payments";
import { CheckoutScreen } from "@/components/store/cart-checkout";
export const metadata = {
  title: "Đặt hàng",
  robots: { index: false, follow: false },
};
export default async function CheckoutPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const profile = user ? await getCustomerProfile() : null;
  return (
    <div className="store-page store-checkout-page">
      <p className="store-eyebrow">Một chút Mộc sắp đến với bạn</p>
      <h1 className="store-page-title mb-10">Gửi thương, nhận Mộc.</h1>
      <CheckoutScreen
        shippingFee={settings.shipping_fee}
        shippingZones={settings.shipping_zones}
        shippingZonesOnly={settings.shipping_zones_only}
        shippingDistanceEnabled={settings.shipping_distance_enabled}
        configured={isConfigured()}
        bankTransferAvailable={isBankTransferAvailable(settings)}
        initialEmail={user?.email || ""}
        initialName={profile?.full_name || ""}
        initialPhone={profile?.phone || ""}
        signedIn={!!user}
      />
    </div>
  );
}
