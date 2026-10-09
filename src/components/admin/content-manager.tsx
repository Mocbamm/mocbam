"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SiteContent } from "@/lib/types";
import {
  contentEntry,
  contentGroups,
  contentSections,
  type ContentGroup,
} from "@/lib/site-content";
import { isContentMediaUrl } from "@/lib/content-media";
import { matchesSearch } from "@/lib/store-discovery";
import {
  adminRequest,
  fieldClass,
  panelClass,
  reportError,
} from "./admin-common";
import { ContentEditor, MediaField } from "./media-editor";

export function ContentManager({ entries }: { entries: SiteContent[] }) {
  const router = useRouter();
  const [group, setGroup] = useState<ContentGroup>("home");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("home-hero");
  const [drafts, setDrafts] = useState<Record<string, SiteContent>>(() =>
    Object.fromEntries(
      contentSections.map((section) => [
        section.key,
        contentEntry(entries, section.key),
      ]),
    ),
  );
  const [savedKeys, setSavedKeys] = useState(
    () => new Set(entries.map((entry) => entry.key)),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const draft = drafts[selected];
  const section = contentSections.find((item) => item.key === selected)!;
  const visible = contentSections.filter(
    (item) =>
      item.group === group &&
      (!search.trim() ||
        matchesSearch(
          `${item.label} ${drafts[item.key].title} ${drafts[item.key].content}`,
          search,
        )),
  );
  const richText =
    [
      "home-hero",
      "home-intro",
      "home-contact",
      "about",
      "about-natural",
      "about-craft",
      "about-warmth",
    ].includes(selected) || section.group === "policies";
  const mediaKind = isContentMediaUrl(draft.content, "video")
    ? "video"
    : "image";
  const [mediaChoice, setMediaChoice] = useState<"image" | "video" | null>(
    null,
  );
  function choose(key: string) {
    setSelected(key);
    setMediaChoice(null);
  }
  function update(key: "title" | "content", value: string) {
    setDrafts((previous) => ({
      ...previous,
      [selected]: { ...previous[selected], [key]: value },
    }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      section.kind === "media" &&
      draft.content !== "none" &&
      !isContentMediaUrl(draft.content, "image") &&
      !isContentMediaUrl(draft.content, "video")
    ) {
      toast.error("Chọn ảnh hoặc video hợp lệ, hoặc gỡ tệp trước khi lưu.");
      return;
    }
    setSaving(true);
    try {
      const exists = savedKeys.has(selected);
      await adminRequest(
        exists ? `/api/admin/content/${selected}` : "/api/admin/content",
        exists ? "PATCH" : "POST",
        draft,
      );
      setSavedKeys((previous) => new Set([...previous, selected]));
      toast.success("Đã cập nhật nội dung.");
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Nhóm nội dung">
        {contentGroups.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={group === item.id ? "default" : "outline"}
            disabled={saving || uploading}
            onClick={() => {
              setGroup(item.id);
              setSearch("");
              choose(
                contentSections.find((section) => section.group === item.id)!
                  .key,
              );
            }}
          >
            {item.title}
          </Button>
        ))}
      </div>
      <p className="text-sm leading-6 text-[#6b7867]">
        Cập nhật lời giới thiệu, tiêu đề và ảnh / video theo mùa. Nội dung mẫu
        luôn có sẵn để bạn bắt đầu; thay đổi xuất hiện sau khi lưu.
      </p>
      <Input
        type="search"
        aria-label="Tìm nội dung"
        placeholder="Tìm theo tiêu đề hoặc nội dung..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[250px_1fr]">
        <div className="lg:hidden">
          <select
            className={fieldClass}
            aria-label="Chọn nội dung"
            value={
              visible.some((item) => item.key === selected) ? selected : ""
            }
            onChange={(event) => choose(event.target.value)}
            disabled={saving || uploading}
          >
            <option value="" disabled>
              Chọn nội dung ({visible.length})
            </option>
            {visible.map((item) => (
              <option value={item.key} key={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <nav
          aria-label="Các mục nội dung"
          className="hidden rounded-2xl border border-[#dfe5d8] bg-white p-2 lg:block"
        >
          {visible.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={saving || uploading}
              onClick={() => choose(item.key)}
              aria-current={selected === item.key ? "page" : undefined}
              className={`block w-full rounded-xl px-4 py-3 text-left text-sm transition-colors ${selected === item.key ? "bg-[#edf3e7] font-medium text-[#426533]" : "text-[#6b7867] hover:bg-[#f6f8f2]"}`}
            >
              {item.label}
            </button>
          ))}
          {!visible.length ? (
            <p className="px-4 py-5 text-sm text-[#788273]">
              Không tìm thấy nội dung phù hợp.
            </p>
          ) : null}
        </nav>
        <form onSubmit={save} className={panelClass}>
          <h2 className="mb-5 text-xl font-semibold">{section.label}</h2>
          <fieldset disabled={saving || uploading} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="content-title">
                {section.kind === "media"
                  ? "Mô tả ảnh / video"
                  : "Tiêu đề hiển thị"}
              </Label>
              <Textarea
                id="content-title"
                rows={2}
                maxLength={200}
                required
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
              />
            </div>
            {section.kind === "media" ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["image", "video"] as const).map((kind) => (
                    <Button
                      key={kind}
                      type="button"
                      variant={
                        (mediaChoice || mediaKind) === kind
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setMediaChoice(kind);
                        update("content", "none");
                      }}
                    >
                      {kind === "image" ? "Ảnh" : "Video"}
                    </Button>
                  ))}
                </div>
                <MediaField
                  key={`${selected}-${mediaChoice || mediaKind}`}
                  id="content-media"
                  label={
                    (mediaChoice || mediaKind) === "image"
                      ? "Ảnh hiển thị"
                      : "Video hiển thị"
                  }
                  kind={mediaChoice || mediaKind}
                  value={draft.content === "none" ? "" : draft.content}
                  onChange={(url) => update("content", url || "none")}
                  disabled={saving}
                  onUploadingChange={setUploading}
                />
                <p className="text-xs text-[#788273]">
                  Gỡ tệp để ẩn hình minh họa ở mục này.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="content-body">Nội dung</Label>
                {richText ? (
                  <ContentEditor
                    key={selected}
                    id="content-body"
                    value={draft.content}
                    onChange={(value) => update("content", value)}
                    disabled={saving || uploading}
                    onUploadingChange={setUploading}
                  />
                ) : (
                  <Textarea
                    id="content-body"
                    rows={4}
                    required
                    value={draft.content}
                    onChange={(event) => update("content", event.target.value)}
                  />
                )}
              </div>
            )}
          </fieldset>
          <Button className="mt-6" disabled={saving || uploading}>
            {saving ? "Đang lưu..." : "Lưu nội dung"}
          </Button>
        </form>
      </div>
    </div>
  );
}
