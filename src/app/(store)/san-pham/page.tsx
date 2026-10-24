import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProducts, getCategories } from "@/lib/catalog";
import { Catalog } from "@/components/store/products";
import { metaDescription, pageMetadata } from "@/lib/seo";
// Each category is its own landing page; a search or price filter is not.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ "danh-muc"?: string }>;
}): Promise<Metadata> {
  const [query, categories] = await Promise.all([
    searchParams,
    getCategories(),
  ]);
  const category = categories.find((item) => item.slug === query["danh-muc"]);
  if (category)
    return pageMetadata({
      title: `${category.name} handmade`,
      description: metaDescription(
        category.description ||
          `${category.name} handmade của Mộc Bàm, làm tỉ mỉ từ chất liệu tự nhiên. Chọn món nhỏ xinh cho bạn hoặc làm quà.`,
      ),
      path: `/san-pham?danh-muc=${encodeURIComponent(category.slug)}`,
    });
  return pageMetadata({
    title: "Sản phẩm handmade",
    description:
      "Tất cả phụ kiện handmade của Mộc Bàm: móc khóa, vòng tay, dây chuyền và nhân vật gỗ nhỏ xinh. Giao hàng tận nơi, đổi trả dễ dàng.",
    path: "/san-pham",
  });
}
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ "danh-muc"?: string; tim?: string }>;
}) {
  const [products, categories, query] = await Promise.all([
    getProducts(),
    getCategories(),
    searchParams,
  ]);
  return (
    <div className="store-catalog-page">
      <nav className="store-breadcrumb" aria-label="Đường dẫn">
        <Link href="/">Trang chủ</Link>
        <ChevronRight size={12} />
        <span>Sản phẩm</span>
      </nav>
      <Catalog
        key={`${query["danh-muc"] || ""}:${query.tim || ""}`}
        products={products}
        categories={categories}
        initialCategory={
          typeof query["danh-muc"] === "string" ? query["danh-muc"] : ""
        }
        initialSearch={typeof query.tim === "string" ? query.tim : ""}
      />
    </div>
  );
}
