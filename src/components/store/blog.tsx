"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { BlogPost } from "@/lib/types";
import { filterPostsByDate, matchesSearch } from "@/lib/store-discovery";
import { Play } from "lucide-react";
import { dateLabel } from "./format";
import { Input } from "@/components/ui/input";

const subscribeHydration = () => () => {};

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
        {post.image_url ? (
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 95vw, 45vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : post.video_url ? (
          <video
            src={post.video_url}
            muted
            preload="metadata"
            aria-label={post.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-serif text-3xl text-[#879775]">
            MỘC BÀM
          </span>
        )}
        {post.video_url ? (
          <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-[#29412d]/85 px-3 py-1 text-xs text-white">
            <Play size={12} fill="currentColor" /> Video
          </span>
        ) : null}
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
  // The HTML appears before React attaches handlers. Keep controls disabled
  // until hydration so the customer's first input cannot be lost.
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const invalidRange = Boolean(from && to && from > to);
  const filtered = filterPostsByDate(posts, from, to)
    .filter(
      (post) =>
        !query.trim() ||
        matchesSearch(`${post.title} ${post.excerpt} ${post.content}`, query),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at),
    );
  return (
    <>
      <div className="mt-10 flex flex-wrap items-end gap-4 border-y border-[#dde1d0] py-5">
        <div className="min-w-48 flex-1">
          <label
            htmlFor="blog-search"
            className="mb-2 block text-xs text-[#66715c]"
          >
            Tìm bài viết
          </label>
          <Input
            id="blog-search"
            type="search"
            disabled={!hydrated}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Một câu chuyện bạn muốn tìm..."
          />
        </div>
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
            disabled={!hydrated}
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
            disabled={!hydrated}
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
            disabled={!hydrated}
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
          {query
            ? "Chưa tìm thấy bài viết phù hợp. Bạn thử từ khóa khác nhé."
            : posts.length
              ? "Chưa có bài viết trong khoảng ngày này. Bạn thử chọn khoảng ngày khác nhé."
              : "Mộc đang viết những câu chuyện đầu tiên. Ghé lại sau nhé."}
        </p>
      )}
    </>
  );
}
