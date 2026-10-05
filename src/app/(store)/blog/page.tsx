import { getPosts } from "@/lib/catalog";
import { BlogCatalog } from "@/components/store/blog";
export const metadata = { title: "Nhật ký Mộc Bàm" };
export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <main className="mx-auto max-w-7xl px-5 pt-14 sm:px-8">
      <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
        Chuyện nhỏ bên hiên
      </p>
      <h1 className="font-serif text-5xl tracking-tight text-[#29412d] sm:text-6xl">
        Nhật ký Mộc Bàm.
      </h1>
      <p className="mt-5 max-w-lg text-sm leading-7 text-[#7c866b]">
        Một chút cảm hứng, một chút chăm sóc, và những câu chuyện phía sau mỗi
        điều nhỏ xinh.
      </p>
      <BlogCatalog posts={posts} />
    </main>
  );
}
