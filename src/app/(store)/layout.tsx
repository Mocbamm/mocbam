import { CartProvider } from "@/lib/cart";
import { getProducts, getSettings } from "@/lib/catalog";
import { StoreHeader, StoreFooter } from "@/components/store/chrome";
import { FaqChat } from "@/components/store/faq-chat";
import { getCurrentUser } from "@/lib/auth";
import { isConfigured } from "@/lib/supabase/config";
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, settings, user] = await Promise.all([
    getProducts(),
    getSettings(),
    getCurrentUser(),
  ]);
  return (
    <CartProvider products={products}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:p-3"
      >
        Đến nội dung chính
      </a>
      <StoreHeader />
      <main id="main-content">{children}</main>
      <StoreFooter settings={settings} />
      <FaqChat
        key={user?.id || "guest"}
        userId={user?.id}
        configured={isConfigured()}
        shopHours={settings.shop_hours}
        name={user?.user_metadata?.full_name || user?.user_metadata?.name}
        email={user?.email}
        phone={user?.user_metadata?.phone || user?.phone}
      />
    </CartProvider>
  );
}
