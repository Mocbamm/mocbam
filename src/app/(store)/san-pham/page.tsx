import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProducts, getCategories } from "@/lib/catalog";
import { Catalog } from "@/components/store/products";
export const metadata: Metadata = { title: "Sản phẩm" };
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
