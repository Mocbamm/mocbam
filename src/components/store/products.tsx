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
import { trackStoreEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "./format";

export function ProductCard({
  product,
  category,
}: {
  product: Product;
  category?: string;
}) {
  const { add } = useCart();
  return (
    <article className="group">
      <Link
        href={`/san-pham/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-[#eceee3]"
      >
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        {product.stock < 1 ? (
          <span className="absolute left-3 top-3 bg-[#faf9f3]/90 px-3 py-1 text-[10px] uppercase tracking-widest">
            Tạm hết hàng
          </span>
        ) : product.featured ? (
          <span className="absolute left-3 top-3 bg-[#faf9f3]/90 px-3 py-1 text-[10px] uppercase tracking-widest">
            Mộc yêu thích
          </span>
        ) : null}
        <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#29412d] transition-transform group-hover:rotate-45">
          <ArrowUpRight size={18} />
        </span>
      </Link>
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
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm text-[#65705c]">{money(product.price)}</p>
          <button
            type="button"
            disabled={product.stock < 1}
            onClick={() => add(product)}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#29412d] disabled:opacity-40"
          >
            <Plus size={14} /> Bỏ giỏ
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
              setQuantity((q) => Math.min(10, product.stock, q + 1))
            }
            disabled={quantity >= Math.min(10, product.stock)}
            className="p-3 disabled:opacity-30"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="text-[11px] text-[#87917c]">
          {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Tạm hết hàng"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button
          disabled={product.stock < 1}
          onClick={() => add(product, quantity)}
          variant="outline"
          className="h-12"
        >
          <ShoppingBag size={16} /> Bỏ vào giỏ
        </Button>
        <Button
          disabled={product.stock < 1}
          onClick={() => {
            if (add(product, quantity)) router.push("/thanh-toan");
          }}
          className="h-12"
        >
          Mua ngay <ArrowUpRight size={16} />
        </Button>
      </div>
    </div>
  );
}
