import type { Metadata } from "next";
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
    <>
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-14 sm:px-8">
        <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
          Gom một chút niềm vui
        </p>
        <h1 className="font-serif text-5xl tracking-[-0.04em] text-[#29412d] sm:text-6xl">
          Điều nhỏ xinh của bạn.
        </h1>
        <p className="mt-5 max-w-lg text-sm leading-7 text-[#778167]">
          Những người bạn nhỏ, những đường vân riêng. Chọn một chút Mộc để đồng
          hành, hay gửi thương đến người bạn quý.
        </p>
      </div>
      <Catalog
        key={`${query["danh-muc"] || ""}:${query.tim || ""}`}
        products={products}
        categories={categories}
        initialCategory={
          typeof query["danh-muc"] === "string" ? query["danh-muc"] : ""
        }
        initialSearch={typeof query.tim === "string" ? query.tim : ""}
      />
    </>
  );
}
