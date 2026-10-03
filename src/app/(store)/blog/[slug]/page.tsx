import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPost } from "@/lib/catalog";
import { dateLabel } from "@/components/store/format";
import { Prose } from "@/components/store/content";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: post?.title || "Nhật ký Mộc" };
}
export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return (
    <article className="mx-auto max-w-4xl px-5 pt-10 sm:px-8">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-xs text-[#7c866b]"
      >
        <ArrowLeft size={13} /> Về Nhật ký Mộc
      </Link>
      <div className="pb-9 pt-10 text-center">
        <p className="text-[10px] uppercase tracking-widest text-[#889777]">
          Chuyện nhỏ bên hiên · {dateLabel(post.created_at)}
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight text-[#29412d] sm:text-6xl">
          {post.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#7c866b]">
          {post.excerpt}
        </p>
      </div>
      <div className="relative aspect-[1.7] bg-[#e8ecdf]">
        <Image
          src={post.image_url}
          alt={post.title}
          fill
          priority
          sizes="(max-width: 768px) 95vw, 850px"
          className="object-cover"
        />
      </div>
      <div className="mx-auto max-w-2xl pt-10">
        <Prose content={post.content} />
      </div>
    </article>
  );
}
