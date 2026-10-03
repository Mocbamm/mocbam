"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteSettings } from "@/lib/types";
import { adminRequest, panelClass, reportError } from "./admin-common";

export function SettingsManager({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  function update<K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await adminRequest("/api/admin/settings", "PATCH", draft);
      toast.success("Đã lưu cài đặt cửa hàng.");
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  }
  const contactFields = [
    { key: "shop_email", label: "Email cửa hàng", type: "email" },
    { key: "shop_phone", label: "Số điện thoại", type: "tel" },
    { key: "shop_address", label: "Địa chỉ", type: "text" },
    { key: "shop_hours", label: "Giờ mở cửa", type: "text" },
  ] as const;
  const socialFields = [
    { key: "facebook_url", label: "Facebook" },
    { key: "instagram_url", label: "Instagram" },
    { key: "tiktok_url", label: "TikTok" },
  ] as const;
  return (
    <form onSubmit={save} className="max-w-4xl space-y-6">
      <fieldset disabled={saving} className="space-y-6">
        <section className={panelClass}>
          <h2 className="mb-5 text-xl font-semibold">Giao hàng</h2>
          <div className="max-w-sm space-y-2">
            <Label htmlFor="shipping-fee">Phí giao hàng cố định (₫)</Label>
            <Input
              id="shipping-fee"
              type="number"
              min={0}
              step={1}
              required
              value={draft.shipping_fee}
              onChange={(event) =>
                update("shipping_fee", Number(event.target.value))
              }
            />
            <p className="text-xs leading-5 text-[#788273]">
              Áp dụng cho đơn đặt mới; đơn đã đặt giữ nguyên phí giao hàng.
            </p>
          </div>
        </section>
        <section className={panelClass}>
          <h2 className="mb-5 text-xl font-semibold">Thông tin liên hệ</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {contactFields.map((field) => (
              <div className="space-y-2" key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  required
                  value={draft[field.key]}
                  onChange={(event) => update(field.key, event.target.value)}
                />
              </div>
            ))}
          </div>
        </section>
        <section className={panelClass}>
          <h2 className="mb-5 text-xl font-semibold">Mạng xã hội</h2>
          <div className="space-y-5">
            {socialFields.map((field) => (
              <div className="space-y-2" key={field.key}>
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type="url"
                  placeholder="https://..."
                  value={draft[field.key]}
                  onChange={(event) => update(field.key, event.target.value)}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[#788273]">
            Để trống nếu cửa hàng chưa có tài khoản trên nền tảng này.
          </p>
        </section>
      </fieldset>
      <Button disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu cài đặt"}
      </Button>
      <p className="text-xs leading-6 text-[#788273]">
        Mã Google Analytics và Meta Pixel được cấu hình bằng biến môi trường khi
        triển khai. Xem hướng dẫn trong README.
      </p>
    </form>
  );
}
