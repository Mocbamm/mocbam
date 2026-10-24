import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getProduct, getProducts, getCategories } from "@/lib/catalog";
import { ProductDetails, ProductCard } from "@/components/store/products";
import { JsonLd } from "@/components/store/json-ld";
import {
  breadcrumbJsonLd,
  metaDescription,
  pageMetadata,
  productImages,
  productJsonLd,
} from "@/lib/seo";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Sản phẩm" };
  return pageMetadata({
    title: product.name,
    description: metaDescription(
      product.description || `${product.name} – phụ kiện handmade của Mộc Bàm.`,
    ),
    path: `/san-pham/${product.slug}`,
    images: productImages(product).map((url) => ({
      url,
      alt: product.name,
    })),
  });
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, products, categories] = await Promise.all([
    getProduct(slug),
    getProducts(),
    getCategories(),
  ]);
  if (!product) notFound();
  const category = categories.find((c) => c.id === product.category_id);
  return (
    <div className="store-product-page">
      <JsonLd
        data={[
          productJsonLd(product, category),
          breadcrumbJsonLd([
            { name: "Trang chủ", path: "/" },
            { name: "Sản phẩm", path: "/san-pham" },
            ...(category
              ? [
                  {
                    name: category.name,
                    path: `/san-pham?danh-muc=${encodeURIComponent(category.slug)}`,
                  },
                ]
              : []),
            { name: product.name, path: `/san-pham/${product.slug}` },
          ]),
        ]}
      />
      <nav className="store-breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={12} />
        <Link href="/san-pham">Sản phẩm</Link>
        <ChevronRight size={12} />
        <span aria-current="page">{product.name}</span>
      </nav>
      <ProductDetails product={product} category={category} />
      <section
        className="store-product-recommendations"
        aria-labelledby="related-products-title"
      >
        <div className="store-product-section-heading">
          <h2 id="related-products-title">Có thể bạn cũng thương</h2>
          <Link href="/san-pham">Xem tất cả</Link>
        </div>
        <div className="store-product-grid">
          {products
            .filter((p) => p.id !== product.id)
            .slice(0, 4)
            .map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                category={categories.find((c) => c.id === p.category_id)?.name}
              />
            ))}
        </div>
      </section>
    </div>
  );
}
