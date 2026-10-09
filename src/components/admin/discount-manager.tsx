"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Mail, Pencil, Plus, X } from "lucide-react";
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

type Scope = "shop" | "product" | "private";
type DiscountDraft = Omit<Discount, "id" | "used_count" | "created_at"> & {
  scope: Scope;
  product_ids: string[];
  customer_user_ids: string[];
};
type EligibleCustomer = { user_id: string; name: string; email: string };
type EligibleProduct = { id: string; name: string; active: boolean };
const scopes: { value: Scope; label: string; description: string }[] = [
  {
    value: "shop",
    label: "Voucher cửa hàng",
    description: "Công khai, áp dụng cho toàn bộ sản phẩm.",
  },
  {
    value: "product",
    label: "Voucher sản phẩm",
    description: "Công khai, giảm giá các sản phẩm được chọn.",
  },
  {
    value: "private",
    label: "Voucher riêng tư",
    description: "Chỉ tài khoản khách hàng được chọn sử dụng.",
  },
];
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
  active: true,
  public_campaign: true,
  scope: "shop",
  product_ids: [],
  customer_user_ids: [],
  customer_user_id: null,
  max_uses: null,
};
function scopeOf(discount: Discount): Scope {
  return discount.scope ?? (discount.customer_user_id ? "private" : "shop");
}
function localDate(value: string | null) {
  return value
    ? new Date(new Date(value).getTime() + 7 * 60 * 60_000)
        .toISOString()
        .slice(0, 16)
    : "";
}
function statusOf(discount: Discount) {
  if (discount.ends_at && new Date(discount.ends_at) <= new Date())
    return "expired";
  if (!discount.active) return "paused";
  if (discount.max_uses !== null && discount.used_count >= discount.max_uses)
    return "used";
  if (discount.starts_at && new Date(discount.starts_at) > new Date())
    return "upcoming";
  return "ongoing";
}
const statusLabels = {
  all: "Tất cả",
  ongoing: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  expired: "Đã kết thúc",
  paused: "Tạm dừng",
  used: "Hết lượt",
};
function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Không giới hạn";
}

export function DiscountManager({
  discounts,
  customers,
  products = [],
}: {
  discounts: Discount[];
  customers: EligibleCustomer[];
  products?: EligibleProduct[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Discount | "new" | null>(null);
  const [draft, setDraft] = useState<DiscountDraft>(blank);
  const [saving, setSaving] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<Scope | "all">("all");
  const [status, setStatus] = useState<keyof typeof statusLabels>("all");
  const [search, setSearch] = useState("");
  const [emailDiscount, setEmailDiscount] = useState<Discount | null>(null);
  function open(discount: Discount | "new", scope: Scope = "shop") {
    setEditing(discount);
    setSearch("");
    if (discount === "new")
      setDraft({ ...blank, scope, public_campaign: scope !== "private" });
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
      setDraft({
        ...fields,
        scope: scopeOf(discount),
        product_ids: discount.product_ids ?? [],
        customer_user_ids: discount.customer_user_ids?.length
          ? discount.customer_user_ids
          : discount.customer_user_id
            ? [discount.customer_user_id]
            : [],
      });
    }
  }
  function update<K extends keyof DiscountDraft>(
    key: K,
    value: DiscountDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  function changeScope(scope: Scope) {
    setDraft((previous) => ({
      ...previous,
      scope,
      public_campaign: scope !== "private",
      customer_user_id: null,
      customer_user_ids: [],
      product_ids: [],
    }));
    setSearch("");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    if (
      editing === "new" &&
      draft.ends_at &&
      new Date(draft.ends_at) <= new Date()
    ) {
      toast.error("Ngày kết thúc phải nằm trong tương lai.");
      return;
    }
    if (draft.scope === "product" && !draft.product_ids.length) {
      toast.error("Chọn ít nhất một sản phẩm áp dụng.");
      return;
    }
    if (draft.scope === "private" && !draft.customer_user_ids.length) {
      toast.error("Chọn ít nhất một khách hàng áp dụng.");
      return;
    }
    setSaving(true);
    try {
      await adminRequest(
        editing === "new"
          ? "/api/admin/discounts"
          : `/api/admin/discounts/${editing.id}`,
        editing === "new" ? "POST" : "PATCH",
        {
          ...draft,
          customer_user_id: null,
          public_campaign: draft.scope !== "private",
        },
      );
      toast.success("Đã lưu ưu đãi. Lịch áp dụng được thực hiện tự động.");
      setEditing(null);
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  }
  async function copyCode(discount: Discount) {
    try {
      await navigator.clipboard.writeText(discount.code);
      toast.success("Đã sao chép mã ưu đãi.");
    } catch {
      toast.error("Không thể sao chép. Vui lòng chọn mã trực tiếp.");
    }
  }
  const filtered = discounts.filter(
    (discount) =>
      (scopeFilter === "all" || scopeOf(discount) === scopeFilter) &&
      (status === "all" || statusOf(discount) === status),
  );
  const recipients = emailDiscount
    ? customers.filter((customer) =>
        (emailDiscount.customer_user_ids?.length
          ? emailDiscount.customer_user_ids
          : emailDiscount.customer_user_id
            ? [emailDiscount.customer_user_id]
            : []
        ).includes(customer.user_id),
      )
    : [];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {scopes.map((scope) => (
          <div key={scope.value} className={panelClass}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">{scope.label}</h2>
              <span className="rounded-full bg-[#edf2e8] px-2 py-0.5 text-xs">
                {
                  discounts.filter(
                    (discount) => scopeOf(discount) === scope.value,
                  ).length
                }
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6b7867]">
              {scope.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => open("new", scope.value)}
                disabled={saving}
              >
                <Plus className="size-4" />
                Tạo voucher
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setScopeFilter(scope.value)}
              >
                Xem danh sách
              </Button>
            </div>
          </div>
        ))}
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
              <Label htmlFor="discount-scope">Loại voucher</Label>
              <select
                id="discount-scope"
                className={fieldClass}
                value={draft.scope}
                onChange={(event) => changeScope(event.target.value as Scope)}
              >
                {scopes.map((scope) => (
                  <option key={scope.value} value={scope.value}>
                    {scope.label}
                  </option>
                ))}
              </select>
            </div>
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
              <Label htmlFor="discount-maximum">
                Giảm tối đa (₫, tùy chọn)
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
            <div className="space-y-2">
              <Label htmlFor="discount-minimum">
                Giá trị sản phẩm tối thiểu của đơn (₫)
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
                Lượt dùng ghi nhận khi đặt đơn; không khôi phục khi hủy đơn.
              </p>
            </div>
            {(["starts_at", "ends_at"] as const).map((key) => (
              <div className="space-y-2" key={key}>
                <Label htmlFor={`discount-${key}`}>
                  {key === "starts_at" ? "Bắt đầu" : "Kết thúc"} (giờ Việt Nam,
                  tùy chọn)
                </Label>
                <Input
                  id={`discount-${key}`}
                  type="datetime-local"
                  value={localDate(draft[key])}
                  onChange={(event) =>
                    update(
                      key,
                      event.target.value
                        ? new Date(
                            `${event.target.value}:00+07:00`,
                          ).toISOString()
                        : null,
                    )
                  }
                />
              </div>
            ))}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="discount-description">Nội dung giới thiệu</Label>
              <Textarea
                id="discount-description"
                value={draft.description}
                maxLength={1000}
                onChange={(event) => update("description", event.target.value)}
              />
            </div>
            {draft.scope !== "shop" && (
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="discount-target-search">
                  {draft.scope === "product"
                    ? `Sản phẩm áp dụng (${draft.product_ids.length} đã chọn)`
                    : `Khách hàng áp dụng (${draft.customer_user_ids.length} đã chọn)`}
                </Label>
                <Input
                  id="discount-target-search"
                  placeholder={
                    draft.scope === "product"
                      ? "Tìm tên sản phẩm…"
                      : "Tìm tên hoặc email khách hàng…"
                  }
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-[#dfe5d8] p-4">
                  {draft.scope === "product" ? (
                    <>
                      {products
                        .filter((product) =>
                          product.name
                            .toLocaleLowerCase("vi")
                            .includes(search.toLocaleLowerCase("vi")),
                        )
                        .map((product) => (
                          <CheckField
                            key={product.id}
                            label={`${product.name}${product.active ? "" : " (đang ẩn)"}`}
                            checked={draft.product_ids.includes(product.id)}
                            onChange={(checked) =>
                              update(
                                "product_ids",
                                checked
                                  ? [...draft.product_ids, product.id]
                                  : draft.product_ids.filter(
                                      (id) => id !== product.id,
                                    ),
                              )
                            }
                          />
                        ))}
                      {!products.length && (
                        <p className="text-sm text-[#6b7867]">
                          Chưa có sản phẩm.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {customers
                        .filter((customer) =>
                          `${customer.name} ${customer.email}`
                            .toLocaleLowerCase("vi")
                            .includes(search.toLocaleLowerCase("vi")),
                        )
                        .map((customer) => (
                          <CheckField
                            key={customer.user_id}
                            label={`${customer.name || customer.email} · ${customer.email}`}
                            checked={draft.customer_user_ids.includes(
                              customer.user_id,
                            )}
                            onChange={(checked) =>
                              update(
                                "customer_user_ids",
                                checked
                                  ? [
                                      ...draft.customer_user_ids,
                                      customer.user_id,
                                    ]
                                  : draft.customer_user_ids.filter(
                                      (id) => id !== customer.user_id,
                                    ),
                              )
                            }
                          />
                        ))}
                      {!customers.length && (
                        <p className="text-sm text-[#6b7867]">
                          Chưa có tài khoản khách hàng. Voucher riêng yêu cầu
                          đăng nhập đúng tài khoản.
                        </p>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-[#788273]">
                  {draft.scope === "product"
                    ? "Mức giảm chỉ tính trên giá trị sản phẩm được chọn trong giỏ hàng."
                    : "Sau khi lưu, chọn Soạn email trong danh sách để chuẩn bị thư riêng cho từng khách hàng."}
                </p>
              </div>
            )}
            {editing !== "new" && (
              <CheckField
                label="Tạm dừng chương trình"
                checked={!draft.active}
                onChange={(checked) => update("active", !checked)}
              />
            )}
            <p className="text-xs leading-6 text-[#788273] md:col-span-2">
              Voucher tự áp dụng từ thời điểm bắt đầu và tự kết thúc theo lịch
              hoặc khi hết lượt. Bỏ trống thời điểm bắt đầu để dùng ngay.
              Voucher cửa hàng/sản phẩm được giới thiệu công khai; voucher riêng
              chỉ dùng khi khách đã chọn đăng nhập. Mức giảm không áp dụng vào
              phí giao hàng.
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
      {emailDiscount && (
        <section className={panelClass} aria-label="Soạn email ưu đãi riêng">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              Gửi mã {emailDiscount.code} cho khách hàng
            </h2>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Đóng phần email"
              onClick={() => setEmailDiscount(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#6b7867]">
            Mỗi liên kết mở bản nháp trong ứng dụng email. Xem lại nội dung và
            chọn gửi trong ứng dụng đó.
          </p>
          <ul className="mt-4 space-y-3">
            {recipients.map((customer) => {
              const subject = `${emailDiscount.title} — ưu đãi riêng từ Mộc Bàm`;
              const body = `Chào ${customer.name || "bạn"},\n\nMộc Bàm gửi bạn mã ưu đãi riêng: ${emailDiscount.code}\nMức giảm: ${emailDiscount.kind === "percentage" ? `${emailDiscount.value}%` : formatPrice(emailDiscount.value)}\n${emailDiscount.description}\nGiá trị đơn tối thiểu: ${formatPrice(emailDiscount.min_subtotal)}\n${emailDiscount.max_discount !== null ? `Giảm tối đa: ${formatPrice(emailDiscount.max_discount)}\n` : ""}Thời gian bắt đầu: ${dateLabel(emailDiscount.starts_at)}\nThời gian kết thúc: ${dateLabel(emailDiscount.ends_at)}\n\nĐăng nhập bằng tài khoản ${customer.email} và nhập mã khi thanh toán trên website Mộc Bàm.\n\nCảm ơn bạn,\nMộc Bàm`;
              return (
                <li
                  key={customer.user_id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0e7] pb-3"
                >
                  <span className="text-sm">
                    {customer.name} · {customer.email}
                  </span>
                  <a
                    className="inline-flex items-center gap-2 rounded-lg border border-[#d4dcce] px-3 py-2 text-sm"
                    href={`mailto:${encodeURIComponent(customer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                  >
                    <Mail className="size-4" />
                    Soạn email
                  </a>
                </li>
              );
            })}
          </ul>
          {!recipients.length && (
            <p className="mt-4 text-sm text-[#6b7867]">
              Không tìm thấy thông tin email của tài khoản đã chọn. Hãy kiểm tra
              lại đối tượng voucher.
            </p>
          )}
        </section>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Loại voucher
          <select
            aria-label="Lọc loại voucher"
            className={`${fieldClass} ml-2 inline-block w-auto`}
            value={scopeFilter}
            onChange={(event) =>
              setScopeFilter(event.target.value as typeof scopeFilter)
            }
          >
            <option value="all">Tất cả loại</option>
            {scopes.map((scope) => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2" aria-label="Lọc trạng thái">
          {Object.entries(statusLabels).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={status === key ? "default" : "outline"}
              onClick={() => setStatus(key as typeof status)}
            >
              {label} (
              {
                discounts.filter(
                  (discount) =>
                    (scopeFilter === "all" ||
                      scopeOf(discount) === scopeFilter) &&
                    (key === "all" || statusOf(discount) === key),
                ).length
              }
              )
            </Button>
          ))}
        </div>
      </div>
      {!filtered.length ? (
        <EmptyState>
          Chưa có ưu đãi phù hợp. Chọn một loại voucher ở trên để tạo chương
          trình.
        </EmptyState>
      ) : (
        <div className={`${panelClass} overflow-x-auto`}>
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="border-b border-[#e8ecdf] text-xs uppercase text-[#77836e]">
              <tr>
                {[
                  "Chương trình / mã",
                  "Loại / đối tượng",
                  "Mức giảm",
                  "Lượt dùng",
                  "Thời gian (Việt Nam)",
                  "Trạng thái",
                  "Thao tác",
                ].map((label) => (
                  <th className="py-3 pr-5" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((discount) => (
                <tr
                  key={discount.id}
                  className="border-b border-[#edf0e7] last:border-0"
                >
                  <td className="py-4 pr-5">
                    <p className="font-medium">{discount.title}</p>
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-2 text-xs text-[#6b7867]"
                      onClick={() => copyCode(discount)}
                      title="Sao chép mã"
                    >
                      {discount.code}
                      <Copy className="size-3" />
                    </button>
                  </td>
                  <td className="pr-5">
                    <p>
                      {
                        scopes.find(
                          (scope) => scope.value === scopeOf(discount),
                        )?.label
                      }
                    </p>
                    <p className="mt-1 text-xs text-[#788273]">
                      {scopeOf(discount) === "private"
                        ? `${discount.customer_user_ids?.length || (discount.customer_user_id ? 1 : 0)} tài khoản được chọn`
                        : scopeOf(discount) === "product"
                          ? `${discount.product_ids?.length || 0} sản phẩm được chọn`
                          : "Mọi khách hàng"}
                    </p>
                  </td>
                  <td className="pr-5">
                    {discount.kind === "percentage"
                      ? `${discount.value}%`
                      : formatPrice(discount.value)}
                  </td>
                  <td className="pr-5">
                    {discount.used_count} / {discount.max_uses ?? "∞"}
                  </td>
                  <td className="pr-5 text-xs leading-6">
                    Từ:{" "}
                    {discount.starts_at
                      ? dateLabel(discount.starts_at)
                      : "Ngay khi tạo"}
                    <br />
                    Đến: {dateLabel(discount.ends_at)}
                  </td>
                  <td className="pr-5 text-xs">
                    {statusLabels[statusOf(discount)]}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={() => open(discount)}
                      >
                        <Pencil className="size-4" />
                        Sửa
                      </Button>
                      {scopeOf(discount) === "private" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEmailDiscount(discount)}
                        >
                          <Mail className="size-4" />
                          Soạn email
                        </Button>
                      )}
                    </div>
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
