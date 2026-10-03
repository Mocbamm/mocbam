import { CartProvider } from "@/lib/cart";
import { getProducts, getSettings } from "@/lib/catalog";
import { StoreHeader, StoreFooter } from "@/components/store/chrome";
import { FaqChat } from "@/components/store/faq-chat";
export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, settings] = await Promise.all([
    getProducts(),
    getSettings(),
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
      <FaqChat />
    </CartProvider>
  );
}
