"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { BlogPost } from "@/lib/types";
import { filterPostsByDate } from "@/lib/store-discovery";
import { dateLabel } from "./format";
import { Input } from "@/components/ui/input";

export function BlogCard({
  post,
  compact = false,
}: {
  post: BlogPost;
  compact?: boolean;
}) {
  const Heading = compact ? "h3" : "h2";
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <div
        className={`relative overflow-hidden bg-[#e8ecdf] ${compact ? "aspect-[1.7]" : "aspect-[1.5]"}`}
      >
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
      <Heading
        className={`mt-2 font-serif text-[#29412d] ${compact ? "text-2xl" : "text-3xl"}`}
      >
        {post.title}
      </Heading>
      <p
        className={`mt-3 leading-7 text-[#7c866b] ${compact ? "text-xs" : "text-sm"}`}
      >
        {post.excerpt}
      </p>
    </Link>
  );
}

export function BlogCatalog({ posts }: { posts: BlogPost[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const invalidRange = Boolean(from && to && from > to);
  const filtered = filterPostsByDate(posts, from, to).sort((a, b) =>
    sort === "oldest"
      ? a.created_at.localeCompare(b.created_at)
      : b.created_at.localeCompare(a.created_at),
  );
  return (
    <>
      <div className="mt-10 flex flex-wrap items-end gap-4 border-y border-[#dde1d0] py-5">
        <div>
          <label
            htmlFor="blog-date-from"
            className="mb-2 block text-xs text-[#66715c]"
          >
            Từ ngày
          </label>
          <Input
            id="blog-date-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="blog-date-to"
            className="mb-2 block text-xs text-[#66715c]"
          >
            Đến ngày
          </label>
          <Input
            id="blog-date-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="blog-sort"
            className="mb-2 block text-xs text-[#66715c]"
          >
            Sắp xếp
          </label>
          <select
            id="blog-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-9 border border-[#d7ddcd] bg-transparent px-3 text-xs"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
        {from || to ? (
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="py-2 text-xs underline underline-offset-4"
          >
            Xóa bộ lọc ngày
          </button>
        ) : null}
        <p aria-live="polite" className="ml-auto py-2 text-xs text-[#7a826e]">
          {filtered.length} bài viết
        </p>
      </div>
      {invalidRange ? (
        <p role="alert" className="mt-4 text-xs text-red-700">
          Ngày bắt đầu cần trước hoặc cùng ngày kết thúc.
        </p>
      ) : null}
      {filtered.length ? (
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          {filtered.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-sm text-[#7c866b]">
          {posts.length
            ? "Chưa có bài viết trong khoảng ngày này. Bạn thử chọn khoảng ngày khác nhé."
            : "Mộc đang viết những câu chuyện đầu tiên. Ghé lại sau nhé."}
        </p>
      )}
    </>
  );
}
