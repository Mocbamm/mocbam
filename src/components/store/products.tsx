"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Plus,
  Minus,
  ShoppingBag,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { Product, Category } from "@/lib/types";
import { useCart } from "@/lib/cart";
import { productOption } from "@/lib/product-options";
import { trackStoreEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "./format";
import { productImages } from "./product-media";

export function ProductCard({
  product,
  category,
}: {
  product: Product;
  category?: string;
}) {
  const { add } = useCart();
  const router = useRouter();
  const images = productImages(product);
  const [imageIndex, setImageIndex] = useState(0);
  const image = (
    <Image
      src={images[imageIndex] || product.image_url}
      alt={`${product.name}${images.length > 1 ? ` — ảnh ${imageIndex + 1}` : ""}`}
      fill
      sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw"
      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
    />
  );
  return (
    <article className="group">
      <div className="relative aspect-square overflow-hidden bg-[#eceee3]">
        {images.length > 1 ? (
          <button
            type="button"
            onClick={() =>
              setImageIndex((index) => (index + 1) % images.length)
            }
            aria-label={`Xem ảnh tiếp theo của ${product.name}`}
            className="relative block h-full w-full"
          >
            {image}
          </button>
        ) : (
          <Link
            href={`/san-pham/${product.slug}`}
            aria-label={`Xem chi tiết ${product.name}`}
            className="relative block h-full w-full"
          >
            {image}
          </Link>
        )}
        {product.stock < 1 ? (
          <span className="pointer-events-none absolute left-3 top-3 bg-[#faf9f3]/90 px-3 py-1 text-[10px] uppercase tracking-widest">
            Tạm hết hàng
          </span>
        ) : (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            {product.featured ? (
              <span className="bg-[#faf9f3]/90 px-3 py-1 text-[10px] uppercase tracking-widest">
                Nổi bật
              </span>
            ) : null}
            {product.is_new ? (
              <span className="bg-[#29412d]/90 px-3 py-1 text-[10px] uppercase tracking-widest text-white">
                Mới
              </span>
            ) : null}
          </div>
        )}
      </div>
      <div className="pt-4">
        <p className="mb-1 text-[9px] uppercase tracking-[0.18em] text-[#848b79]">
          {category || "Gỗ & những điều nhỏ xinh"}
        </p>
        <Link
          href={`/san-pham/${product.slug}`}
          className="text-sm font-medium text-[#2e3f2c] hover:underline"
        >
          {product.name}
        </Link>
        <p className="mt-2 text-sm text-[#65705c]">
          {product.variants?.length ? "Từ " : ""}
          {money(product.price)}
        </p>
        {images.length > 1 ? (
          <p aria-live="polite" className="mt-2 text-[10px] text-[#848b79]">
            Ảnh {imageIndex + 1}/{images.length} · Bấm ảnh để xem thêm
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={product.stock < 1}
            onClick={() =>
              product.variants?.length
                ? router.push(`/san-pham/${product.slug}`)
                : add(product)
            }
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            className="flex min-h-9 items-center justify-center gap-1.5 border border-[#c5d0b9] px-2 py-2 text-[10px] uppercase tracking-wider text-[#29412d] disabled:opacity-40"
          >
            <Plus size={14} />{" "}
            {product.variants?.length ? "Chọn mẫu" : "Bỏ giỏ"}
          </button>
          <button
            type="button"
            disabled={product.stock < 1}
            onClick={() => {
              if (product.variants?.length)
                router.push(`/san-pham/${product.slug}`);
              else if (add(product)) router.push("/thanh-toan");
            }}
            aria-label={`Mua ngay ${product.name}`}
            className="min-h-9 bg-[#29412d] px-2 py-2 text-[10px] uppercase tracking-wider text-white disabled:opacity-40"
          >
            Mua ngay
          </button>
        </div>
      </div>
    </article>
  );
}
export function Catalog({
  products,
  categories,
  initialCategory = "",
  initialSearch = "",
}: {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
  initialSearch?: string;
}) {
  const ceiling = Math.max(
    1000000,
    Math.ceil(Math.max(0, ...products.map((p) => p.price)) / 10000) * 10000,
  );
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [maximum, setMaximum] = useState(ceiling);
  const [sort, setSort] = useState("featured");
  const categoryId = categories.find((c) => c.slug === category)?.id;
  const filtered = products
    .filter(
      (p) =>
        (!categoryId || p.category_id === categoryId) &&
        p.price <= maximum &&
        `${p.name} ${p.description}`
          .toLocaleLowerCase("vi")
          .includes(search.trim().toLocaleLowerCase("vi")),
    )
    .sort((a, b) =>
      sort === "price-asc"
        ? a.price - b.price
        : sort === "price-desc"
          ? b.price - a.price
          : sort === "newest"
            ? b.created_at.localeCompare(a.created_at)
            : Number(b.featured) - Number(a.featured),
    );
  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dde1d0] py-6">
        <div className="flex flex-wrap gap-2">
          {[{ slug: "", name: "Tất cả" }, ...categories].map((c) => (
            <button
              key={c.slug}
              onClick={() => setCategory(c.slug)}
              className={`rounded-full px-5 py-2 text-xs transition-colors ${category === c.slug ? "bg-[#29412d] text-white" : "border border-[#d7ddcd] hover:bg-[#edf0e5]"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#7a826e]">
          {filtered.length} điều nhỏ xinh
        </p>
      </div>
      <div className="grid gap-8 pb-12 pt-8 lg:grid-cols-[210px_1fr]">
        <aside className="space-y-6">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
            <SlidersHorizontal size={14} /> Tìm điều bạn thích
          </p>
          <div className="relative">
            <label htmlFor="product-search" className="sr-only">
              Tìm sản phẩm
            </label>
            <Input
              id="product-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tên sản phẩm..."
              className="pr-8"
            />
            <Search
              size={15}
              className="absolute right-3 top-3 text-[#89917c]"
            />
          </div>
          <div>
            <label
              htmlFor="product-price"
              className="block text-xs text-[#66715c]"
            >
              Khoảng giá · đến {money(maximum)}
            </label>
            <input
              id="product-price"
              type="range"
              min="0"
              max={ceiling}
              step="10000"
              value={maximum}
              onChange={(e) => setMaximum(Number(e.target.value))}
              className="mt-4 w-full accent-[#29412d]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[#8a927c]">
              <span>0đ</span>
              <span>{money(ceiling)}</span>
            </div>
          </div>
          <div>
            <label
              htmlFor="product-sort"
              className="mb-2 block text-xs text-[#66715c]"
            >
              Sắp xếp theo
            </label>
            <select
              id="product-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full border border-[#d7ddcd] bg-transparent px-3 py-2 text-xs"
            >
              <option value="featured">Mộc gợi ý</option>
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá thấp đến cao</option>
              <option value="price-desc">Giá cao đến thấp</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setCategory("");
              setSearch("");
              setMaximum(ceiling);
              setSort("featured");
            }}
            className="text-xs underline underline-offset-4"
          >
            Xóa bộ lọc
          </button>
        </aside>
        <div>
          {filtered.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  category={
                    categories.find((c) => c.id === p.category_id)?.name
                  }
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-[#d7ddcd] px-6 text-center">
              <p className="font-serif text-2xl">
                Chưa tìm thấy điều bạn thích
              </p>
              <p className="mt-3 text-sm text-[#7a826e]">
                Thử một từ khóa khác hoặc nới rộng khoảng giá nhé.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export function ProductActions({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState(
    product.variants?.find((variant) => variant.active && variant.stock > 0)
      ?.id || "",
  );
  const option = productOption(product, variantId || undefined);
  const availableStock = option?.stock || 0;
  const { add } = useCart();
  const router = useRouter();
  const viewed = useRef("");
  useEffect(() => {
    function sendView() {
      if (viewed.current === product.id) return;
      if (
        trackStoreEvent("view_item", {
          currency: "VND",
          value: product.price,
          items: [
            {
              item_id: product.id,
              item_name: product.name,
              price: product.price,
            },
          ],
          content_ids: [product.id],
          content_type: "product",
        })
      )
        viewed.current = product.id;
    }
    sendView();
    window.addEventListener("mocbam:analytics-ready", sendView);
    return () => window.removeEventListener("mocbam:analytics-ready", sendView);
  }, [product]);
  return (
    <div>
      {product.variants?.length ? (
        <div className="mt-6 space-y-3">
          <label
            htmlFor={`variant-${product.id}`}
            className="block text-xs text-[#6c765e]"
          >
            Chọn màu / phân loại
          </label>
          <select
            id={`variant-${product.id}`}
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setQuantity(1);
            }}
            className="w-full rounded-lg border border-[#d8ddce] bg-white px-3 py-3 text-sm"
          >
            <option value="" disabled>
              Chọn phân loại
            </option>
            {product.variants
              .filter((variant) => variant.active)
              .map((variant) => (
                <option
                  key={variant.id}
                  value={variant.id}
                  disabled={variant.stock < 1}
                >
                  {variant.name} · {money(variant.price)}
                  {variant.stock < 1 ? " · Hết hàng" : ""}
                </option>
              ))}
          </select>
          {option && (
            <div className="flex items-center gap-3">
              {option.image_url !== product.image_url && (
                <Image
                  src={option.image_url}
                  alt={option.name}
                  width={64}
                  height={64}
                  className="size-16 rounded-lg object-cover"
                />
              )}
              <p className="text-lg text-[#617654]">{money(option.price)}</p>
            </div>
          )}
        </div>
      ) : null}
      <div className="mt-6 flex items-center gap-4">
        <span className="text-xs text-[#6c765e]">Số lượng</span>
        <div className="flex items-center border border-[#d8ddce]">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="p-3 disabled:opacity-30"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-8 text-center text-sm">{quantity}</span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() =>
              setQuantity((q) => Math.min(10, availableStock, q + 1))
            }
            disabled={quantity >= Math.min(10, availableStock)}
            className="p-3 disabled:opacity-30"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-[11px] text-[#87917c]">
          {availableStock > 0
            ? `Còn ${availableStock} sản phẩm`
            : "Tạm hết hàng"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button
          disabled={availableStock < 1}
          onClick={() => add(product, quantity, variantId || undefined)}
          variant="outline"
          className="h-12"
        >
          <ShoppingBag size={16} /> Bỏ vào giỏ
        </Button>
        <Button
          disabled={availableStock < 1}
          onClick={() => {
            if (add(product, quantity, variantId || undefined))
              router.push("/thanh-toan");
          }}
          className="h-12"
        >
          Mua ngay <ArrowUpRight size={16} />
        </Button>
      </div>
    </div>
  );
}
