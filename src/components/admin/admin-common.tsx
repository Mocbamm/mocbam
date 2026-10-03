"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrderStatus } from "@/lib/types";

export const fieldClass =
  "w-full rounded-lg border border-[#d4dcce] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#37533c] focus:ring-2 focus:ring-[#37533c]/10 disabled:opacity-50";
export const panelClass =
  "rounded-2xl border border-[#dfe5d8] bg-white p-5 shadow-sm sm:p-6";
export const orderLabels: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang chuẩn bị",
  shipped: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};
export const categoryOptions = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Nhân vật" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Chuỗi" },
];

export async function adminRequest(
  url: string,
  method: string,
  body?: unknown,
) {
  const response = await fetch(url, {
    method,
    headers:
      body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "Không thể lưu thay đổi. Vui lòng thử lại.");
  return data;
}
export function reportError(error: unknown) {
  toast.error(
    error instanceof Error
      ? error.message
      : "Đã có lỗi xảy ra. Vui lòng thử lại.",
  );
}
export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#cfd9c8] bg-white/70 px-6 py-12 text-center text-sm leading-6 text-[#6b7867]">
      {children}
    </div>
  );
}
export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status === "cancelled" ? "bg-red-50 text-red-700" : status === "completed" ? "bg-green-50 text-green-800" : "bg-[#f1f2df] text-[#68683e]"}`}
    >
      {orderLabels[status]}
    </span>
  );
}
export function CheckField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[#294836]"
      />
      {label}
    </label>
  );
}

export function ImageField({
  value,
  onChange,
  disabled,
  onUploadingChange,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 4_000_000
    ) {
      toast.error("Chọn ảnh JPG, PNG hoặc WebP, tối đa 4 MB.");
      return;
    }
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const data = await adminRequest("/api/admin/upload", "POST", body);
      onChange(data.url);
      toast.success("Đã tải ảnh lên.");
    } catch (error) {
      reportError(error);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  return (
    <div className="space-y-2">
      <Label>Ảnh</Label>
      <div className="flex items-start gap-4">
        {value && (/^https:\/\//.test(value) || value.startsWith("/")) && (
          <Image
            src={value}
            alt="Ảnh xem trước"
            width={88}
            height={88}
            unoptimized
            className="size-22 rounded-xl border border-[#dfe5d8] object-cover"
          />
        )}
        <div className="flex-1 space-y-2">
          <Input
            type="text"
            placeholder="URL ảnh Supabase hoặc đường dẫn ảnh đã tải"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled || uploading}
            required
            aria-label="URL ảnh"
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void upload(event.target.files?.[0])}
            className="hidden"
            aria-label="Chọn ảnh tải lên"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {uploading ? "Đang tải..." : "Tải ảnh lên"}
          </Button>
          <p className="text-xs text-[#788273]">
            URL HTTPS từ Supabase, /images/... hoặc ảnh đã tải. Tải JPG, PNG
            hoặc WebP · tối đa 4 MB.
          </p>
        </div>
      </div>
    </div>
  );
}
