"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { BlogPost } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  adminRequest,
  CheckField,
  EmptyState,
  ImageField,
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
  published: false,
};
export function PostManager({ posts }: { posts: BlogPost[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<BlogPost | "new" | null>(null);
  const [draft, setDraft] = useState<PostDraft>(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      <div className="flex justify-end">
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
          <fieldset disabled={saving} className="grid gap-5 md:grid-cols-2">
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
              <ImageField
                value={draft.image_url}
                onChange={(url) => update("image_url", url)}
                disabled={saving}
                onUploadingChange={setUploading}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="post-content">Nội dung bài viết</Label>
              <Textarea
                id="post-content"
                rows={12}
                required
                value={draft.content}
                onChange={(event) => update("content", event.target.value)}
              />
              <p className="text-xs text-[#788273]">
                Văn bản thuần, cách các đoạn bằng một dòng trống. Mã HTML sẽ
                được hiển thị như chữ.
              </p>
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
      {posts.length === 0 ? (
        <EmptyState>
          Chưa có bài viết. Bắt đầu với một câu chuyện nhỏ của Mộc Bàm.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
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
