import Link from "next/link";
import { notFound } from "next/navigation";
import { Leaf, PackageCheck, ArrowLeft } from "lucide-react";
import { getProduct, getProducts, getCategories } from "@/lib/catalog";
import { ProductActions, ProductCard } from "@/components/store/products";
import { money } from "@/components/store/format";
import { ProductGallery } from "@/components/store/product-media";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product?.name || "Sản phẩm" };
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
    <main className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
      <Link
        href="/san-pham"
        className="inline-flex items-center gap-2 text-xs text-[#7b866b]"
      >
        <ArrowLeft size={13} /> Về những điều nhỏ xinh
      </Link>
      <div className="mt-7 grid gap-10 md:grid-cols-2 md:gap-16">
        <ProductGallery product={product} />
        <div className="self-center">
          <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#889777]">
            {category?.name || "Mộc Bàm"}
          </p>
          <h1 className="font-serif text-4xl leading-tight tracking-[-0.04em] text-[#29412d] sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-5 text-xl text-[#617654]">{money(product.price)}</p>
          <p className="mt-7 whitespace-pre-line text-sm leading-8 text-[#727d64]">
            {product.description}
          </p>
          <ProductActions product={product} />
          <div className="mt-7 space-y-3 border-t border-[#dde1d0] pt-5 text-xs text-[#7a866a]">
            <p className="flex items-center gap-2">
              <Leaf size={14} /> Mỗi đường vân gỗ có nét riêng, như bạn vậy.
            </p>
            <p className="flex items-center gap-2">
              <PackageCheck size={14} /> Phí giao hàng được hiển thị trước khi
              gửi đơn.
            </p>
          </div>
          <Link
            href="/chinh-sach"
            className="mt-5 inline-block text-xs underline underline-offset-4 text-[#718064]"
          >
            Hướng dẫn mua hàng & chăm sóc
          </Link>
        </div>
      </div>
      <section className="pt-20">
        <h2 className="mb-7 font-serif text-3xl text-[#29412d]">
          Có thể bạn cũng thương
        </h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4">
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
    </main>
  );
}
