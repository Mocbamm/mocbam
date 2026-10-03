import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPosts } from "@/lib/catalog";
import { dateLabel } from "@/components/store/format";
export const metadata = { title: "Nhật ký Mộc" };
export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <main className="mx-auto max-w-7xl px-5 pt-14 sm:px-8">
      <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
        Chuyện nhỏ bên hiên
      </p>
      <h1 className="font-serif text-5xl tracking-tight text-[#29412d] sm:text-6xl">
        Nhật ký Mộc.
      </h1>
      <p className="mt-5 max-w-lg text-sm leading-7 text-[#7c866b]">
        Một chút cảm hứng, một chút chăm sóc, và những câu chuyện phía sau mỗi
        điều nhỏ xinh.
      </p>
      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group">
            <div className="relative aspect-[1.5] overflow-hidden bg-[#e8ecdf]">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 95vw, 45vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>
            <p className="mt-5 text-[10px] text-[#8b947d]">
              {dateLabel(post.created_at)}
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[#29412d]">
              {post.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#7c866b]">
              {post.excerpt}
            </p>
            <span className="mt-5 inline-flex items-center gap-3 text-xs">
              Đọc câu chuyện <ArrowUpRight size={14} />
            </span>
          </Link>
        ))}
      </div>
      {!posts.length ? (
        <p className="mt-12 text-sm text-[#7c866b]">
          Mộc đang viết những câu chuyện đầu tiên. Ghé lại sau nhé.
        </p>
      ) : null}
    </main>
  );
}
