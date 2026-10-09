"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { matchesSearch } from "@/lib/store-discovery";
import { ContentEditor, MediaField } from "./media-editor";
import { Label } from "@/components/ui/label";
import type { BlogPost } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  adminRequest,
  CheckField,
  EmptyState,
  panelClass,
  reportError,
} from "./admin-common";
type PostDraft = Omit<BlogPost, "id" | "created_at">;
const blank: PostDraft = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  image_url: "",
  video_url: "",
  published: false,
};
export function PostManager({ posts }: { posts: BlogPost[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<BlogPost | "new" | null>(null);
  const [draft, setDraft] = useState<PostDraft>(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = posts.filter(
    (post) =>
      (!search.trim() ||
        matchesSearch(
          `${post.title} ${post.excerpt} ${post.content}`,
          search,
        )) &&
      (status === "all" || post.published === (status === "published")),
  );
  function open(post: BlogPost | "new") {
    setEditing(post);
    setDraft(
      post === "new"
        ? { ...blank }
        : {
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            image_url: post.image_url,
            video_url: post.video_url || "",
            published: post.published,
          },
    );
  }
  function update<K extends keyof PostDraft>(key: K, value: PostDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await adminRequest(
        editing === "new"
          ? "/api/admin/posts"
          : `/api/admin/posts/${editing.id}`,
        editing === "new" ? "POST" : "PATCH",
        draft,
      );
      toast.success("Đã lưu bài viết.");
      setEditing(null);
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Label htmlFor="post-search">Tìm bài viết</Label>
          <Input
            className="mt-2"
            id="post-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tiêu đề hoặc nội dung..."
          />
        </div>
        <div>
          <Label htmlFor="post-status">Trạng thái</Label>
          <select
            id="post-status"
            className="mt-2 block h-9 rounded-md border border-[#d7ddcd] px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>
        <Button onClick={() => open("new")} disabled={saving || uploading}>
          <Plus className="size-4" />
          Viết bài mới
        </Button>
      </div>
      {editing && (
        <form onSubmit={save} className={panelClass}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {editing === "new" ? "Bài viết mới" : "Chỉnh sửa bài viết"}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Đóng biểu mẫu"
              onClick={() => setEditing(null)}
              disabled={saving || uploading}
            >
              <X className="size-4" />
            </Button>
          </div>
          <fieldset
            disabled={saving || uploading}
            className="grid gap-5 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="post-title">Tiêu đề</Label>
              <Input
                id="post-title"
                required
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-slug">Đường dẫn</Label>
              <Input
                id="post-slug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="tieu-de-bai-viet"
                value={draft.slug}
                onChange={(event) => update("slug", event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="post-excerpt">Mô tả ngắn</Label>
              <Textarea
                id="post-excerpt"
                rows={2}
                required
                value={draft.excerpt}
                onChange={(event) => update("excerpt", event.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <MediaField
                id="post-cover"
                label="Ảnh bìa (không bắt buộc)"
                kind="image"
                value={draft.image_url}
                onChange={(url) => update("image_url", url)}
                disabled={saving}
                onUploadingChange={setUploading}
              />
            </div>
            <div className="md:col-span-2">
              <MediaField
                id="post-video"
                label="Video đầu bài (không bắt buộc)"
                kind="video"
                value={draft.video_url || ""}
                onChange={(url) => update("video_url", url)}
                disabled={saving}
                onUploadingChange={setUploading}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="post-content">Nội dung bài viết</Label>
              <ContentEditor
                id="post-content"
                value={draft.content}
                onChange={(value) => update("content", value)}
                disabled={saving || uploading}
                onUploadingChange={setUploading}
              />
            </div>
            <CheckField
              label="Xuất bản trên cửa hàng"
              checked={draft.published}
              onChange={(checked) => update("published", checked)}
            />
          </fieldset>
          <div className="mt-6 flex gap-3">
            <Button disabled={saving || uploading}>
              {saving ? "Đang lưu..." : "Lưu bài viết"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || uploading}
              onClick={() => setEditing(null)}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}
      <p className="text-xs text-[#788273]" aria-live="polite">
        {filtered.length} bài viết
      </p>
      {filtered.length === 0 ? (
        <EmptyState>
          {posts.length
            ? "Không có bài viết phù hợp. Thử từ khóa hoặc trạng thái khác."
            : "Chưa có bài viết. Bắt đầu với một câu chuyện nhỏ của Mộc Bàm."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((post) => (
            <article key={post.id} className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs ${post.published ? "bg-[#edf3e7] text-[#426533]" : "bg-[#f2ecd9] text-[#89763a]"}`}
                >
                  {post.published ? "Đã xuất bản" : "Bản nháp"}
                </span>
                <span className="text-xs text-[#788273]">
                  {formatDate(post.created_at)}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-semibold">{post.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6b7867]">
                {post.excerpt}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                size="sm"
                onClick={() => open(post)}
                disabled={saving || uploading}
              >
                <Pencil className="size-3.5" />
                Chỉnh sửa
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
