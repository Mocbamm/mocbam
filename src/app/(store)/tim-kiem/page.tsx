import Link from "next/link";
import { Search } from "lucide-react";
import { getProducts, getCategories, getPosts } from "@/lib/catalog";
import { matchesSearch } from "@/lib/store-discovery";
import { plainText } from "@/lib/rich-text";
import { ProductCard } from "@/components/store/products";
import { BlogCard } from "@/components/store/blog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "Tìm kiếm" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query =
    typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const [products, categories, posts] = await Promise.all([
    getProducts(),
    getCategories(),
    getPosts(),
  ]);
  const foundProducts = products.filter((product) =>
    matchesSearch(
      `${product.name} ${product.description} ${categories.find((category) => category.id === product.category_id)?.name || ""}`,
      query,
    ),
  );
  const foundPosts = posts.filter((post) =>
    matchesSearch(
      `${post.title} ${post.excerpt} ${plainText(post.content)}`,
      query,
    ),
  );
  const count = foundProducts.length + foundPosts.length;
  return (
    <div className="store-page store-search-page">
      <p className="store-eyebrow">Tìm điều bạn thương</p>
      <h1 className="store-page-title">Tìm kiếm</h1>
      <p className="store-page-description">
        Sản phẩm và những câu chuyện của Mộc Bàm.
      </p>
      <form action="/tim-kiem" method="get" className="store-search-page-form">
        <label htmlFor="search-page-query" className="sr-only">
          Từ khóa tìm kiếm
        </label>
        <Input
          id="search-page-query"
          name="q"
          type="search"
          required
          maxLength={200}
          defaultValue={query}
          placeholder="Bạn đang tìm điều gì?"
          className="min-w-0 flex-1"
        />
        <Button type="submit">
          <Search size={16} /> Tìm kiếm
        </Button>
      </form>
      {query ? (
        <p className="store-result-count" aria-live="polite">
          {count} kết quả cho “{query}”
        </p>
      ) : (
        <p className="store-result-count">
          Nhập từ khóa để tìm sản phẩm hoặc bài viết.
        </p>
      )}
      {foundProducts.length ? (
        <section
          className="store-search-group"
          aria-labelledby="search-products-title"
        >
          <h2 id="search-products-title" className="store-section-title mb-6">
            Sản phẩm ({foundProducts.length})
          </h2>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
            {foundProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                category={
                  categories.find(
                    (category) => category.id === product.category_id,
                  )?.name
                }
              />
            ))}
          </div>
        </section>
      ) : null}
      {foundPosts.length ? (
        <section
          className="store-search-group"
          aria-labelledby="search-posts-title"
        >
          <h2 id="search-posts-title" className="store-section-title mb-6">
            Nhật ký Mộc Bàm ({foundPosts.length})
          </h2>
          <div className="grid gap-10 md:grid-cols-2">
            {foundPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ) : null}
      {query && !count ? (
        <div className="store-empty-state mt-10 text-sm leading-7">
          Chưa tìm thấy kết quả. Thử từ khóa ngắn hơn hoặc{" "}
          <Link href="/san-pham" className="underline underline-offset-4">
            khám phá tất cả sản phẩm
          </Link>
          .
        </div>
      ) : null}
    </div>
  );
}
