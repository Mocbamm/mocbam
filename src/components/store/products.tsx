"use client";
import Image from "./image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  ShoppingBag,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  X,
  PackageCheck,
  Leaf,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { Product, Category } from "@/lib/types";
import { openCartDrawer, useCart } from "@/lib/cart";
import { productOption } from "@/lib/product-options";
import { trackStoreEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "./format";
import { ProductGallery, productImages } from "./product-media";
import { policyHref } from "./policies";
import "./catalog.css";

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
  const photoHintId = useId();
  const image = (
    <Image
      src={images[imageIndex] || product.image_url}
      alt={`${product.name}${images.length > 1 ? ` — ảnh ${imageIndex + 1}` : ""}`}
      fill
      sizes="(max-width: 640px) 46vw, (max-width: 1024px) 31vw, 23vw"
      className="store-product-card-image"
    />
  );
  return (
    <article className="store-product-card">
      <div className="store-product-card-media">
        {images.length > 1 ? (
          <button
            type="button"
            onClick={() =>
              setImageIndex((index) => (index + 1) % images.length)
            }
            aria-label={`Xem ảnh tiếp theo của ${product.name}`}
            aria-describedby={photoHintId}
            className="store-product-image-link"
          >
            {image}
          </button>
        ) : (
          <Link
            href={`/san-pham/${product.slug}`}
            aria-label={`Xem chi tiết ${product.name}`}
            className="store-product-image-link"
          >
            {image}
          </Link>
        )}
        <div className="store-product-badges">
          {product.stock < 1 ? (
            <span className="store-product-badge">Tạm hết hàng</span>
          ) : (
            <>
              {product.featured ? (
                <span className="store-product-badge">Nổi bật</span>
              ) : null}
              {product.is_new ? (
                <span className="store-product-badge store-product-badge-new">
                  Mới
                </span>
              ) : null}
            </>
          )}
        </div>
        {images.length > 1 ? (
          <span className="store-product-image-count" aria-live="polite">
            Ảnh {imageIndex + 1}/{images.length}
          </span>
        ) : null}
      </div>
      <div className="store-product-card-copy">
        {category ? (
          <p className="store-product-card-category">{category}</p>
        ) : null}
        <Link
          href={`/san-pham/${product.slug}`}
          className="store-product-card-title"
        >
          {product.name}
        </Link>
        <p className="store-product-card-price">
          {product.variants?.length ? "Từ " : ""}
          {money(product.price)}
        </p>
        {images.length > 1 ? (
          <p id={photoHintId} className="store-product-photo-hint">
            Bấm ảnh để xem góc khác
          </p>
        ) : null}
        <div className="store-product-card-actions">
          <button
            type="button"
            disabled={product.stock < 1}
            onClick={() =>
              product.variants?.length
                ? router.push(`/san-pham/${product.slug}`)
                : add(product) && openCartDrawer()
            }
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
            className="store-card-button store-card-button-outline"
          >
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
            className="store-card-button store-card-button-primary"
          >
            Mua ngay
          </button>
        </div>
      </div>
    </article>
  );
}

type CatalogFilterValues = {
  category: string;
  search: string;
  maximum: number;
};

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<CatalogFilterValues>({
    category,
    search,
    maximum,
  });
  const selectedCategory = categories.find((c) => c.slug === category);
  const categoryId = selectedCategory?.id;
  const bannerProduct =
    products.find((product) =>
      selectedCategory
        ? product.category_id === selectedCategory.id
        : product.featured,
    ) || products[0];
  const hasFilters = Boolean(category || search.trim() || maximum < ceiling);
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
  function resetFilters() {
    setCategory("");
    setSearch("");
    setMaximum(ceiling);
    setSort("featured");
  }
  return (
    <section className="store-catalog" aria-label="Danh sách sản phẩm">
      <header className="store-collection-banner">
        <div className="store-collection-banner-copy">
          <p className="store-collection-eyebrow">Gom một chút niềm vui</p>
          <h1>{selectedCategory?.name || "Nhỏ xinh, đủ thương."}</h1>
          <p>
            {selectedCategory?.description ||
              "Những người bạn nhỏ, những đường vân riêng. Chọn một chút Mộc để đồng hành, hay gửi thương đến người bạn quý."}
          </p>
        </div>
        {bannerProduct ? (
          <div className="store-collection-banner-media">
            <Image
              src={bannerProduct.image_url}
              alt={bannerProduct.name}
              fill
              preload
              sizes="35vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </header>
      <div className="store-catalog-categories" aria-label="Danh mục sản phẩm">
        {[{ slug: "", name: "Tất cả" }, ...categories].map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => setCategory(c.slug)}
            aria-pressed={category === c.slug}
            className="store-category-tab"
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="store-catalog-toolbar">
        <DialogPrimitive.Root
          open={filtersOpen}
          onOpenChange={(open) => {
            if (open) setDraft({ category, search, maximum });
            setFiltersOpen(open);
          }}
        >
          <DialogPrimitive.Trigger className="store-mobile-filter-trigger">
            <SlidersHorizontal size={17} /> Bộ lọc
            {hasFilters ? (
              <span
                className="store-filter-dot"
                aria-label="Đang áp dụng bộ lọc"
              />
            ) : null}
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="store-filter-overlay" />
            <DialogPrimitive.Content className="store-filter-sheet">
              <div className="store-filter-sheet-heading">
                <DialogPrimitive.Title>Bộ lọc sản phẩm</DialogPrimitive.Title>
                <DialogPrimitive.Close aria-label="Đóng bộ lọc">
                  <X size={21} />
                </DialogPrimitive.Close>
              </div>
              <DialogPrimitive.Description className="store-filter-description">
                Tìm một chút Mộc vừa ý bạn.
              </DialogPrimitive.Description>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setCategory(draft.category);
                  setSearch(draft.search);
                  setMaximum(draft.maximum);
                  setFiltersOpen(false);
                }}
              >
                <div className="store-filter-sheet-fields">
                  <div className="store-filter-field">
                    <label htmlFor="mobile-product-search">Tìm sản phẩm</label>
                    <Input
                      id="mobile-product-search"
                      value={draft.search}
                      onChange={(event) =>
                        setDraft({ ...draft, search: event.target.value })
                      }
                      placeholder="Tên sản phẩm..."
                    />
                  </div>
                  <div className="store-filter-field">
                    <label htmlFor="mobile-product-category">Danh mục</label>
                    <select
                      id="mobile-product-category"
                      value={draft.category}
                      onChange={(event) =>
                        setDraft({ ...draft, category: event.target.value })
                      }
                    >
                      <option value="">Tất cả sản phẩm</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="store-filter-field">
                    <label htmlFor="mobile-product-price">
                      Giá tối đa · {money(draft.maximum)}
                    </label>
                    <input
                      id="mobile-product-price"
                      type="range"
                      min="0"
                      max={ceiling}
                      step="10000"
                      value={draft.maximum}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          maximum: Number(event.target.value),
                        })
                      }
                    />
                    <div className="store-price-range-labels">
                      <span>0đ</span>
                      <span>{money(ceiling)}</span>
                    </div>
                  </div>
                </div>
                <div className="store-filter-sheet-footer">
                  <button
                    type="button"
                    className="store-card-button store-card-button-outline"
                    onClick={() =>
                      setDraft({ category: "", search: "", maximum: ceiling })
                    }
                  >
                    Đặt lại
                  </button>
                  <button
                    type="submit"
                    className="store-card-button store-card-button-primary"
                  >
                    Áp dụng
                  </button>
                </div>
              </form>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
        <div className="store-catalog-desktop-filters">
          <div className="store-catalog-search">
            <label htmlFor="product-search" className="sr-only">
              Tìm sản phẩm
            </label>
            <Search size={17} />
            <Input
              id="product-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm..."
            />
          </div>
          <details className="store-catalog-price-filter">
            <summary>
              Khoảng giá <ChevronDown size={15} />
            </summary>
            <div className="store-catalog-price-popover">
              <label htmlFor="product-price">
                Giá tối đa · {money(maximum)}
              </label>
              <input
                id="product-price"
                type="range"
                min="0"
                max={ceiling}
                step="10000"
                value={maximum}
                onChange={(event) => setMaximum(Number(event.target.value))}
              />
              <div className="store-price-range-labels">
                <span>0đ</span>
                <span>{money(ceiling)}</span>
              </div>
            </div>
          </details>
        </div>
        <p className="store-catalog-count" aria-live="polite">
          {filtered.length} sản phẩm
        </p>
        <div className="store-catalog-sort">
          <label htmlFor="product-sort" className="sr-only">
            Sắp xếp theo
          </label>
          <select
            id="product-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="featured">Mộc gợi ý</option>
            <option value="newest">Mới nhất</option>
            <option value="price-asc">Giá thấp đến cao</option>
            <option value="price-desc">Giá cao đến thấp</option>
          </select>
        </div>
      </div>
      {hasFilters ? (
        <div className="store-active-filters">
          {search.trim() ? <span>Từ khóa: “{search.trim()}”</span> : null}
          {maximum < ceiling ? <span>Đến {money(maximum)}</span> : null}
          <button type="button" onClick={resetFilters}>
            Xóa bộ lọc <X size={13} />
          </button>
        </div>
      ) : null}
      {filtered.length ? (
        <div className="store-product-grid">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              category={categories.find((c) => c.id === p.category_id)?.name}
            />
          ))}
        </div>
      ) : (
        <div className="store-catalog-empty">
          <Search size={28} strokeWidth={1.4} />
          <h2>Chưa tìm thấy điều bạn thích</h2>
          <p>Thử một từ khóa khác hoặc nới rộng khoảng giá nhé.</p>
          <button
            type="button"
            className="store-card-button store-card-button-outline"
            onClick={resetFilters}
          >
            Xem tất cả sản phẩm
          </button>
        </div>
      )}
    </section>
  );
}

export function ProductDetails({
  product,
  category,
}: {
  product: Product;
  category?: Category;
}) {
  const [variantImage, setVariantImage] = useState(
    product.variants?.find((variant) => variant.active && variant.stock > 0)
      ?.image_url || "",
  );
  return (
    <div className="store-product-detail-grid">
      <ProductGallery
        key={variantImage || product.id}
        product={product}
        variantImage={variantImage}
      />
      <div className="store-product-purchase-panel">
        {category ? (
          <Link
            className="store-product-detail-category"
            href={`/san-pham?danh-muc=${category.slug}`}
          >
            {category.name}
          </Link>
        ) : null}
        <h1>{product.name}</h1>
        <ProductActions product={product} onVariantChange={setVariantImage} />
        <div className="store-product-reassurance">
          <p>
            <Leaf size={17} /> Mỗi đường vân gỗ có nét riêng, như bạn vậy.
          </p>
          <p>
            <PackageCheck size={17} /> Phí giao hàng được hiển thị trước khi gửi
            đơn.
          </p>
        </div>
        <div className="store-product-accordions">
          <details>
            <summary>
              Giao hàng & thanh toán <ChevronDown size={17} />
            </summary>
            <div>
              <p>
                Chọn địa chỉ nhận hàng để xem phí vận chuyển và phương thức
                thanh toán đang áp dụng trước khi gửi đơn.
              </p>
              <Link href={policyHref("van-chuyen")}>
                Xem chính sách giao hàng <ChevronRight size={14} />
              </Link>
            </div>
          </details>
          <details>
            <summary>
              Đổi trả & chăm sóc <ChevronDown size={17} />
            </summary>
            <div>
              <p>
                Mộc luôn sẵn lòng hỗ trợ bạn khi cần thông tin về sản phẩm, cách
                chăm sóc hoặc đổi trả.
              </p>
              <Link href={policyHref("doi-tra")}>
                Xem hướng dẫn đổi trả & chăm sóc <ChevronRight size={14} />
              </Link>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
export function ProductActions({
  product,
  onVariantChange,
}: {
  product: Product;
  onVariantChange?: (image: string) => void;
}) {
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
    <div className="store-product-actions">
      <p className="store-product-detail-price" aria-live="polite">
        {money(option?.price ?? product.price)}
      </p>
      <p className="store-product-description">{product.description}</p>
      {product.variants?.length ? (
        <div className="store-product-variant">
          <label
            htmlFor={`variant-${product.id}`}
            className="store-product-control-label"
          >
            Chọn màu / phân loại
          </label>
          <select
            id={`variant-${product.id}`}
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setQuantity(1);
              onVariantChange?.(
                product.variants?.find(
                  (variant) => variant.id === event.target.value,
                )?.image_url || "",
              );
            }}
            className="store-product-variant-select"
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
        </div>
      ) : null}
      <div className="store-product-quantity-row">
        <span className="store-product-control-label">Số lượng</span>
        <div className="store-product-quantity">
          <button
            type="button"
            aria-label="Giảm số lượng"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="store-product-quantity-button"
          >
            <Minus size={14} />
          </button>
          <span className="store-product-quantity-value">{quantity}</span>
          <button
            type="button"
            aria-label="Tăng số lượng"
            onClick={() =>
              setQuantity((q) => Math.min(10, availableStock, q + 1))
            }
            disabled={quantity >= Math.min(10, availableStock)}
            className="store-product-quantity-button"
          >
            <Plus size={14} />
          </button>
        </div>
        <span className="store-product-stock">
          {availableStock > 0
            ? `Còn ${availableStock} sản phẩm`
            : "Tạm hết hàng"}
        </span>
      </div>
      <div className="store-product-purchase-buttons">
        <Button
          disabled={availableStock < 1}
          onClick={() => {
            if (add(product, quantity, variantId || undefined))
              openCartDrawer();
          }}
          variant="outline"
          className="store-purchase-button-outline"
        >
          <ShoppingBag size={16} /> Bỏ vào giỏ
        </Button>
        <Button
          disabled={availableStock < 1}
          onClick={() => {
            if (add(product, quantity, variantId || undefined))
              router.push("/thanh-toan");
          }}
          className="store-purchase-button-primary"
        >
          Mua ngay
        </Button>
      </div>
    </div>
  );
}
