"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Discount } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import {
  adminRequest,
  CheckField,
  EmptyState,
  fieldClass,
  panelClass,
  reportError,
} from "./admin-common";

type DiscountDraft = Omit<Discount, "id" | "used_count" | "created_at">;
const blank: DiscountDraft = {
  code: "",
  title: "",
  description: "",
  kind: "percentage",
  value: 10,
  min_subtotal: 0,
  max_discount: null,
  starts_at: null,
  ends_at: null,
  active: false,
  public_campaign: false,
  customer_user_id: null,
  max_uses: null,
};
function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

type EligibleCustomer = { user_id: string; name: string; email: string };
export function DiscountManager({
  discounts,
  customers,
}: {
  discounts: Discount[];
  customers: EligibleCustomer[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Discount | "new" | null>(null);
  const [draft, setDraft] = useState<DiscountDraft>(blank);
  const [saving, setSaving] = useState(false);
  function open(discount: Discount | "new") {
    setEditing(discount);
    if (discount === "new") setDraft({ ...blank });
    else {
      const {
        id: _id,
        used_count: _used,
        created_at: _created,
        ...fields
      } = discount;
      void _id;
      void _used;
      void _created;
      setDraft(fields);
    }
  }
  function update<K extends keyof DiscountDraft>(
    key: K,
    value: DiscountDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await adminRequest(
        editing === "new"
          ? "/api/admin/discounts"
          : `/api/admin/discounts/${editing.id}`,
        editing === "new" ? "POST" : "PATCH",
        draft,
      );
      toast.success("Đã lưu ưu đãi.");
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
        <Button onClick={() => open("new")} disabled={saving}>
          <Plus className="size-4" />
          Thêm ưu đãi
        </Button>
      </div>
      {editing && (
        <form onSubmit={save} className={panelClass}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {editing === "new" ? "Tạo ưu đãi" : "Chỉnh sửa ưu đãi"}
            </h2>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Đóng biểu mẫu"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              <X className="size-4" />
            </Button>
          </div>
          <fieldset disabled={saving} className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="discount-title">Tên chương trình</Label>
              <Input
                id="discount-title"
                value={draft.title}
                required
                maxLength={160}
                onChange={(event) => update("title", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-code">Mã ưu đãi</Label>
              <Input
                id="discount-code"
                value={draft.code}
                required
                maxLength={40}
                pattern="[A-Za-z0-9_-]+"
                onChange={(event) =>
                  update("code", event.target.value.toUpperCase())
                }
                placeholder="MOCBAM10"
              />
              <p className="text-xs text-[#788273]">
                Khách nhập mã này khi thanh toán. Mỗi đơn áp dụng một mã.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="discount-description">Nội dung giới thiệu</Label>
              <Textarea
                id="discount-description"
                value={draft.description}
                maxLength={1000}
                onChange={(event) => update("description", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-kind">Cách giảm giá</Label>
              <select
                id="discount-kind"
                className={fieldClass}
                value={draft.kind}
                onChange={(event) => {
                  update("kind", event.target.value as DiscountDraft["kind"]);
                  update("value", 10);
                }}
              >
                <option value="percentage">Theo phần trăm (%)</option>
                <option value="fixed">Số tiền cố định (₫)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-value">
                {draft.kind === "percentage"
                  ? "Phần trăm giảm (%)"
                  : "Số tiền giảm (₫)"}
              </Label>
              <Input
                id="discount-value"
                type="number"
                min={1}
                max={draft.kind === "percentage" ? 100 : 100_000_000}
                step={1}
                required
                value={draft.value}
                onChange={(event) =>
                  update("value", Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-minimum">
                Giá trị sản phẩm tối thiểu (₫)
              </Label>
              <Input
                id="discount-minimum"
                type="number"
                min={0}
                max={100_000_000}
                step={1}
                required
                value={draft.min_subtotal}
                onChange={(event) =>
                  update("min_subtotal", Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-maximum">
                Giảm tối đa (₫, để trống nếu không giới hạn)
              </Label>
              <Input
                id="discount-maximum"
                type="number"
                min={0}
                max={100_000_000}
                step={1}
                value={draft.max_discount ?? ""}
                onChange={(event) =>
                  update(
                    "max_discount",
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
              />
            </div>
            {(["starts_at", "ends_at"] as const).map((key) => (
              <div className="space-y-2" key={key}>
                <Label htmlFor={`discount-${key}`}>
                  {key === "starts_at" ? "Bắt đầu" : "Kết thúc"} (tùy chọn)
                </Label>
                <Input
                  id={`discount-${key}`}
                  type="datetime-local"
                  value={localDate(draft[key])}
                  onChange={(event) =>
                    update(
                      key,
                      event.target.value
                        ? new Date(event.target.value).toISOString()
                        : null,
                    )
                  }
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="discount-limit">
                Số lượt sử dụng tối đa (tùy chọn)
              </Label>
              <Input
                id="discount-limit"
                type="number"
                min={1}
                max={1_000_000}
                step={1}
                value={draft.max_uses ?? ""}
                onChange={(event) =>
                  update(
                    "max_uses",
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
              />
              <p className="text-xs text-[#788273]">
                Lượt sử dụng được ghi nhận khi đặt đơn và giữ lại khi hủy đơn.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount-customer">Khách hàng áp dụng</Label>
              <select
                id="discount-customer"
                className={fieldClass}
                value={draft.customer_user_id || ""}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    customer_user_id: event.target.value || null,
                    public_campaign: event.target.value
                      ? false
                      : previous.public_campaign,
                  }))
                }
              >
                <option value="">Mọi khách hàng có mã</option>
                {draft.customer_user_id &&
                  !customers.some(
                    (customer) => customer.user_id === draft.customer_user_id,
                  ) && (
                    <option value={draft.customer_user_id}>
                      Tài khoản đã lưu ({draft.customer_user_id})
                    </option>
                  )}
                {customers.map((customer) => (
                  <option key={customer.user_id} value={customer.user_id}>
                    {customer.name || customer.email} · {customer.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#788273]">
                Ưu đãi riêng chỉ dùng được khi đúng khách hàng đăng nhập; gửi mã
                trực tiếp cho khách.
              </p>
            </div>
            <div className="flex flex-wrap gap-5 md:col-span-2">
              <CheckField
                label="Kích hoạt ưu đãi"
                checked={draft.active}
                onChange={(checked) => update("active", checked)}
              />
              <CheckField
                label="Giới thiệu trên trang chủ"
                checked={draft.public_campaign}
                disabled={Boolean(draft.customer_user_id)}
                onChange={(checked) => update("public_campaign", checked)}
              />
            </div>
            <p className="text-xs leading-6 text-[#788273] md:col-span-2">
              Chỉ chương trình công khai còn hiệu lực và còn lượt dùng xuất hiện
              trên trang chủ. Ưu đãi giảm vào giá sản phẩm, không giảm phí giao
              hàng. Mốc giờ theo thiết bị đang sử dụng.
            </p>
          </fieldset>
          <div className="mt-6 flex gap-3">
            <Button disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu ưu đãi"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setEditing(null)}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}
      {discounts.length === 0 ? (
        <EmptyState>
          Chưa có ưu đãi. Tạo mã giảm giá cho cửa hàng hoặc cho một khách hàng.
        </EmptyState>
      ) : (
        <div className={`${panelClass} overflow-x-auto`}>
          <table className="w-full min-w-[670px] text-left text-sm">
            <thead className="border-b border-[#e8ecdf] text-xs uppercase text-[#77836e]">
              <tr>
                <th className="py-3">Chương trình</th>
                <th>Mức giảm</th>
                <th>Đối tượng</th>
                <th>Lượt dùng</th>
                <th>Trạng thái</th>
                <th>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => (
                <tr
                  key={discount.id}
                  className="border-b border-[#edf0e7] last:border-0"
                >
                  <td className="py-4">
                    <p className="font-medium">{discount.title}</p>
                    <p className="mt-1 text-xs text-[#7c8774]">
                      {discount.code}
                    </p>
                  </td>
                  <td>
                    {discount.kind === "percentage"
                      ? `${discount.value}%`
                      : formatPrice(discount.value)}
                  </td>
                  <td>
                    {discount.customer_user_id
                      ? "Khách hàng riêng"
                      : discount.public_campaign
                        ? "Công khai"
                        : "Có mã"}
                  </td>
                  <td>
                    {discount.used_count}
                    {discount.max_uses ? ` / ${discount.max_uses}` : ""}
                  </td>
                  <td>
                    {!discount.active
                      ? "Đã tắt"
                      : discount.ends_at &&
                          new Date(discount.ends_at) <= new Date()
                        ? "Đã kết thúc"
                        : discount.starts_at &&
                            new Date(discount.starts_at) > new Date()
                          ? "Sắp bắt đầu"
                          : discount.max_uses &&
                              discount.used_count >= discount.max_uses
                            ? "Hết lượt"
                            : "Đang áp dụng"}
                  </td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => open(discount)}
                    >
                      <Pencil className="size-4" />
                      Sửa
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
