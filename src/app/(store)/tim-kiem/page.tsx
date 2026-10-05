import Link from "next/link";
import { Search } from "lucide-react";
import { getProducts, getCategories, getPosts } from "@/lib/catalog";
import { matchesSearch } from "@/lib/store-discovery";
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
    matchesSearch(`${post.title} ${post.excerpt} ${post.content}`, query),
  );
  const count = foundProducts.length + foundPosts.length;
  return (
    <main className="mx-auto max-w-7xl px-5 pt-14 sm:px-8">
      <h1 className="font-serif text-5xl tracking-tight text-[#29412d]">
        Tìm kiếm
      </h1>
      <p className="mt-4 text-sm text-[#7c866b]">
        Sản phẩm và những câu chuyện của Mộc Bàm.
      </p>
      <form
        action="/tim-kiem"
        method="get"
        className="mt-7 flex max-w-xl gap-3"
      >
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
          className="flex-1"
        />
        <Button type="submit">
          <Search size={16} /> Tìm kiếm
        </Button>
      </form>
      {query ? (
        <p className="mt-7 text-sm text-[#7c866b]">
          {count} kết quả cho “{query}”
        </p>
      ) : (
        <p className="mt-7 text-sm text-[#7c866b]">
          Nhập từ khóa để tìm sản phẩm hoặc bài viết.
        </p>
      )}
      {foundProducts.length ? (
        <section className="mt-10" aria-labelledby="search-products-title">
          <h2
            id="search-products-title"
            className="mb-6 font-serif text-3xl text-[#29412d]"
          >
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
        <section className="mt-12" aria-labelledby="search-posts-title">
          <h2
            id="search-posts-title"
            className="mb-6 font-serif text-3xl text-[#29412d]"
          >
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
        <div className="mt-10 border border-dashed border-[#d7ddcd] p-7 text-sm leading-7 text-[#7c866b]">
          Chưa tìm thấy kết quả. Thử từ khóa ngắn hơn hoặc{" "}
          <Link href="/san-pham" className="underline underline-offset-4">
            khám phá tất cả sản phẩm
          </Link>
          .
        </div>
      ) : null}
    </main>
  );
}
