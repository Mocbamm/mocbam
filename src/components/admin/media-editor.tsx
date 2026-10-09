"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Video, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  contentBlocks,
  isContentMediaUrl,
  mediaMarkdown,
  parseContentMedia,
  type ContentMedia,
} from "@/lib/content-media";
import { adminRequest, reportError } from "./admin-common";

export function MediaField({
  id,
  label,
  kind,
  value,
  onChange,
  disabled,
  onUploadingChange,
}: {
  id: string;
  label: string;
  kind: ContentMedia["kind"];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    const image = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    const video = ["video/mp4", "video/webm"].includes(file.type);
    if (
      (kind === "image" ? !image : !video) ||
      file.size > (image ? 4_000_000 : 20_000_000)
    ) {
      toast.error(
        kind === "image"
          ? "Chọn ảnh JPG, PNG hoặc WebP, tối đa 4 MB."
          : "Chọn video MP4 hoặc WebM, tối đa 20 MB.",
      );
      if (input.current) input.current.value = "";
      return;
    }
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const data = await adminRequest("/api/admin/upload", "POST", body);
      onChange(data.url);
      toast.success("Đã tải tệp lên. Lưu nội dung để hiển thị trên cửa hàng.");
    } catch (error) {
      reportError(error);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{label}</Label>
      {value && isContentMediaUrl(value, kind) ? (
        kind === "video" ? (
          <video
            src={value}
            controls
            preload="metadata"
            className="max-h-48 w-full rounded-xl bg-[#e8ecdf]"
          />
        ) : (
          <Image
            src={value}
            alt="Ảnh xem trước"
            width={240}
            height={160}
            unoptimized
            className="max-h-48 w-auto rounded-xl border border-[#dfe5d8] object-contain"
          />
        )
      ) : null}
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || uploading}
        placeholder={
          kind === "image"
            ? "URL ảnh hoặc /images/..."
            : "Đường dẫn video đã tải lên"
        }
      />
      <input
        ref={input}
        type="file"
        accept={
          kind === "image"
            ? "image/jpeg,image/png,image/webp"
            : "video/mp4,video/webm"
        }
        disabled={disabled || uploading}
        onChange={(event) => void upload(event.target.files?.[0])}
        className="hidden"
        aria-label={`Chọn tệp ${label.toLowerCase()}`}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : kind === "image" ? (
            <ImagePlus className="size-4" />
          ) : (
            <Video className="size-4" />
          )}
          {uploading
            ? "Đang tải..."
            : value
              ? "Thay tệp"
              : kind === "image"
                ? "Tải ảnh lên"
                : "Tải video lên"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
          >
            <X className="size-4" /> Gỡ {kind === "image" ? "ảnh" : "video"}
          </Button>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-[#788273]">
        {kind === "image"
          ? "JPG, PNG, WebP · tối đa 4 MB. Có thể dùng ảnh đã tải hoặc URL HTTPS từ Supabase."
          : "MP4, WebM · tối đa 20 MB. Video hiển thị với nút phát và điều khiển âm thanh."}
      </p>
    </div>
  );
}

export function ContentEditor({
  id,
  value,
  onChange,
  disabled,
  onUploadingChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [kind, setKind] = useState<ContentMedia["kind"]>("image");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const blocks = contentBlocks(value);
  const media = blocks.flatMap((block, index) => {
    const item = parseContentMedia(block);
    return item ? [{ ...item, index }] : [];
  });
  function insertMedia() {
    if (!isContentMediaUrl(url, kind)) {
      toast.error("Chọn ảnh hoặc video hợp lệ trước khi chèn.");
      return;
    }
    const markdown = mediaMarkdown({ kind, url, caption });
    if (editingBlock !== null) {
      onChange(
        blocks
          .map((block, index) => (index === editingBlock ? markdown : block))
          .join("\n\n"),
      );
    } else {
      const start = textarea.current?.selectionStart ?? value.length;
      const end = textarea.current?.selectionEnd ?? value.length;
      onChange(
        `${value.slice(0, start).trimEnd()}\n\n${markdown}\n\n${value.slice(end).trimStart()}`.trim(),
      );
    }
    setUrl("");
    setCaption("");
    setEditingBlock(null);
  }
  return (
    <div className="space-y-4">
      <Textarea
        ref={textarea}
        id={id}
        value={value}
        rows={14}
        required
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          setEditingBlock(null);
        }}
      />
      <p className="text-xs leading-5 text-[#788273]">
        Cách các đoạn bằng dòng trống. Dùng ## cho tiêu đề, - cho gạch đầu dòng.
        Đặt con trỏ ở vị trí cần chèn ảnh / video. HTML hiển thị như chữ.
      </p>
      {media.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Ảnh và video trong nội dung</p>
          {media.map((item) => (
            <div
              key={`${item.index}-${item.url}`}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-[#dfe5d8] px-3 py-2 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">
                {item.kind === "image" ? "Ảnh" : "Video"}:{" "}
                {item.caption || item.url.split("/").at(-1)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setKind(item.kind);
                  setUrl(item.url);
                  setCaption(item.caption);
                  setEditingBlock(item.index);
                }}
              >
                Thay / sửa
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  onChange(
                    blocks
                      .filter((_, index) => index !== item.index)
                      .join("\n\n"),
                  );
                  setEditingBlock(null);
                }}
              >
                Gỡ
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <details
        className="rounded-xl border border-[#dfe5d8] bg-[#f7f8f2] p-4"
        open={editingBlock !== null || undefined}
      >
        <summary className="cursor-pointer text-sm font-medium">
          {editingBlock === null
            ? "Chèn ảnh / video vào nội dung"
            : "Thay ảnh / video đã chọn"}
        </summary>
        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            {(["image", "video"] as const).map((type) => (
              <Button
                type="button"
                key={type}
                variant={kind === type ? "default" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setKind(type);
                  setUrl("");
                }}
              >
                {type === "image" ? "Ảnh" : "Video"}
              </Button>
            ))}
          </div>
          <MediaField
            key={kind}
            id={`${id}-media`}
            label={
              kind === "image"
                ? "Ảnh chèn vào nội dung"
                : "Video chèn vào nội dung"
            }
            kind={kind}
            value={url}
            onChange={setUrl}
            disabled={disabled}
            onUploadingChange={onUploadingChange}
          />
          <div className="space-y-2">
            <Label htmlFor={`${id}-caption`}>Mô tả / chú thích</Label>
            <Input
              id={`${id}-caption`}
              value={caption}
              disabled={disabled}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Mô tả giúp người đọc hiểu ảnh hoặc video"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={disabled || !url}
            onClick={insertMedia}
          >
            {editingBlock === null
              ? "Chèn vào nội dung"
              : "Cập nhật tệp trong nội dung"}
          </Button>
        </div>
      </details>
    </div>
  );
}
