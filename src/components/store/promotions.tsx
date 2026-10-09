import Link from "next/link";
import { ArrowUpRight, Tag } from "lucide-react";
import type { Discount, Product } from "@/lib/types";
import { money } from "./format";

export function PromotionBanner({
  promotions,
  products = [],
}: {
  promotions: Discount[];
  products?: Pick<Product, "id" | "slug" | "name">[];
}) {
  if (!promotions.length) return null;
  return (
    <section
      className="mx-auto max-w-7xl px-5 pt-12 sm:px-8"
      aria-labelledby="promotions-title"
    >
      <div className="border border-[#c8d3b9] bg-[#e8eedc] p-6 sm:p-9">
        <p className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#617654]">
          <Tag size={14} /> Một món quà từ Mộc
        </p>
        <h2
          id="promotions-title"
          className="font-serif text-3xl text-[#29412d]"
        >
          Ưu đãi đang diễn ra
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {promotions.map((promotion) => (
            <article
              key={promotion.id}
              className="border-t border-[#bdcba9] pt-5"
            >
              <h3 className="font-serif text-2xl text-[#29412d]">
                {promotion.title}
              </h3>
              {promotion.description ? (
                <p className="mt-2 text-sm leading-7 text-[#68795a]">
                  {promotion.description}
                </p>
              ) : null}
              <p className="mt-3 text-lg font-medium text-[#29412d]">
                {promotion.kind === "percentage"
                  ? `Giảm ${promotion.value}%`
                  : `Giảm ${money(promotion.value)}`}
                {promotion.max_discount ? (
                  <span className="ml-2 text-xs font-normal">
                    (tối đa {money(promotion.max_discount)})
                  </span>
                ) : null}
              </p>
              {promotion.scope === "product" ? (
                <div className="mt-3 text-xs leading-6 text-[#68795a]">
                  <p>Chỉ giảm giá các sản phẩm trong chương trình:</p>
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {products
                      .filter((product) =>
                        promotion.product_ids?.includes(product.id),
                      )
                      .map((product) => (
                        <li key={product.id}>
                          <Link
                            href={`/san-pham/${product.slug}`}
                            className="underline underline-offset-4"
                          >
                            {product.name}
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#68795a]">
                  Áp dụng cho toàn bộ sản phẩm.
                </p>
              )}
              <p className="mt-2 text-xs leading-6 text-[#68795a]">
                {promotion.min_subtotal > 0
                  ? `Áp dụng cho đơn từ ${money(promotion.min_subtotal)}. `
                  : ""}
                {promotion.ends_at
                  ? `Đến ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(promotion.ends_at))}.`
                  : ""}
              </p>
              <p className="mt-3 text-xs leading-6 text-[#68795a]">
                Dùng mã{" "}
                <strong className="mx-1 border border-[#bdcba9] bg-[#faf9f3] px-2 py-1 font-mono text-sm tracking-wider text-[#29412d]">
                  {promotion.code}
                </strong>{" "}
                tại bước thanh toán.
              </p>
            </article>
          ))}
        </div>
        <Link
          href="/san-pham"
          className="mt-6 inline-flex items-center gap-3 border-b border-[#93a280] pb-2 text-xs text-[#29412d]"
        >
          Chọn món bạn thương <ArrowUpRight size={14} />
        </Link>
      </div>
    </section>
  );
}
