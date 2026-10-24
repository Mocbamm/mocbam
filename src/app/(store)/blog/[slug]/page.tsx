import Image from "@/components/store/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/catalog";
import { dateLabel } from "@/components/store/format";
import { Prose } from "@/components/store/content";
import { JsonLd } from "@/components/store/json-ld";
import {
  breadcrumbJsonLd,
  metaDescription,
  pageMetadata,
  postJsonLd,
  shareableImage,
} from "@/lib/seo";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Nhật ký Mộc Bàm" };
  const image = shareableImage(post.image_url);
  return pageMetadata({
    title: post.title,
    description: metaDescription(post.excerpt || post.content),
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.created_at,
    images: image ? [{ url: image, alt: post.title }] : undefined,
  });
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
    <article className="store-page store-article-page">
      <JsonLd
        data={[
          postJsonLd(post),
          breadcrumbJsonLd([
            { name: "Trang chủ", path: "/" },
            { name: "Nhật ký Mộc Bàm", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <Link href="/blog" className="store-back-link">
        <ArrowLeft size={16} /> Nhật ký Mộc Bàm
      </Link>
      <div className="store-article-heading">
        <p className="store-eyebrow">
          Chuyện nhỏ bên hiên ·{" "}
          <time dateTime={post.created_at}>{dateLabel(post.created_at)}</time>
        </p>
        <h1 className="store-page-title mt-5">{post.title}</h1>
        <p className="store-page-description mx-auto">{post.excerpt}</p>
      </div>
      {post.video_url ? (
        <video
          src={post.video_url}
          poster={post.image_url || undefined}
          controls
          preload="metadata"
          aria-label={`Video: ${post.title}`}
          className="store-article-cover w-full"
        />
      ) : post.image_url ? (
        <div className="store-article-cover relative aspect-[1.7]">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            preload
            sizes="(max-width: 768px) 95vw, 850px"
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="store-article-body">
        <Prose content={post.content} />
      </div>
    </article>
  );
}
