"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Inquiry } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  adminRequest,
  EmptyState,
  panelClass,
  reportError,
} from "./admin-common";

export function InquiryManager({ inquiries }: { inquiries: Inquiry[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [saving, setSaving] = useState<string | null>(null);
  const visible = inquiries.filter(
    (inquiry) => filter === "all" || !inquiry.resolved,
  );
  async function toggle(inquiry: Inquiry) {
    setSaving(inquiry.id);
    try {
      await adminRequest(`/api/admin/inquiries/${inquiry.id}`, "PATCH", {
        resolved: !inquiry.resolved,
      });
      toast.success(
        inquiry.resolved ? "Đã mở lại yêu cầu." : "Đã đánh dấu xử lý.",
      );
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(null);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === "open" ? "default" : "outline"}
          onClick={() => setFilter("open")}
        >
          Chưa xử lý ({inquiries.filter((inquiry) => !inquiry.resolved).length})
        </Button>
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          Tất cả
        </Button>
      </div>
      {visible.length === 0 ? (
        <EmptyState>
          {filter === "open"
            ? "Bạn đã xử lý tất cả lời nhắn. Những liên hệ mới sẽ xuất hiện tại đây."
            : "Chưa có lời nhắn từ khách hàng."}
        </EmptyState>
      ) : (
        visible.map((inquiry) => (
          <article key={inquiry.id} className={panelClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{inquiry.name}</h2>
                <p className="mt-1 text-xs text-[#788273]">
                  {formatDate(inquiry.created_at)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs ${inquiry.resolved ? "bg-[#edf3e7] text-[#426533]" : "bg-[#f2ecd9] text-[#89763a]"}`}
              >
                {inquiry.resolved ? "Đã xử lý" : "Chưa xử lý"}
              </span>
            </div>
            <p className="my-5 whitespace-pre-wrap text-sm leading-7">
              {inquiry.message}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0e7] pt-4">
              <div className="space-y-1 text-sm text-[#6b7867]">
                <p className="break-all">Email: {inquiry.email}</p>
                {inquiry.phone && <p>Điện thoại: {inquiry.phone}</p>}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={saving === inquiry.id}
                onClick={() => void toggle(inquiry)}
              >
                {inquiry.resolved ? (
                  <RotateCcw className="size-3.5" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {saving === inquiry.id
                  ? "Đang lưu..."
                  : inquiry.resolved
                    ? "Mở lại"
                    : "Đã xử lý"}
              </Button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
