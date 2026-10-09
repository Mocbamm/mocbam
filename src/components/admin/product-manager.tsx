"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Copy, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product, ProductVariant } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import {
  adminRequest,
  categoryOptions,
  CheckField,
  EmptyState,
  fieldClass,
  ImageField,
  panelClass,
  reportError,
} from "./admin-common";

type ProductDraft = Omit<Product, "id" | "created_at" | "revision">;
const blank: ProductDraft = {
  name: "",
  slug: "",
  category_id: categoryOptions[0].id,
  price: 0,
  cost_price: null,
  stock: 0,
  image_url: "",
  image_urls: [],
  video_url: "",
  variants: [],
  description: "",
  active: true,
  featured: false,
  is_new: false,
};
export function ProductManager({
  products,
  sold = {},
}: {
  products: Product[];
  sold?: Record<string, number>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const visible = products.filter(
    (product) =>
      (visibility === "all" || product.active === (visibility === "visible")) &&
      (categoryFilter === "all" || product.category_id === categoryFilter) &&
      (stockFilter === "all" ||
        (stockFilter === "out"
          ? product.stock === 0
          : stockFilter === "low"
            ? (product.stock > 0 && product.stock <= 5) ||
              Boolean(
                product.variants?.some(
                  (variant) =>
                    variant.active && variant.stock > 0 && variant.stock <= 5,
                ),
              )
            : product.stock > 5)) &&
      `${product.name} ${product.slug} ${(product.variants || []).map((variant) => variant.name).join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(query.toLocaleLowerCase("vi")),
  );
  function open(product: Product | "new") {
    setEditing(product);
    setDraft(
      product === "new"
        ? { ...blank }
        : {
            name: product.name,
            slug: product.slug,
            category_id: product.category_id,
            price: product.price,
            cost_price: product.cost_price ?? null,
            stock: product.stock,
            image_url: product.image_url,
            image_urls: product.image_urls || [],
            video_url: product.video_url || "",
            variants: structuredClone(product.variants || []),
            description: product.description,
            active: product.active,
            featured: product.featured,
            is_new: product.is_new || false,
          },
    );
  }
  function duplicate(product: Product) {
    open(product);
    setEditing("new");
    setDraft((previous) => ({
      ...previous,
      name: `${product.name} (bản sao)`,
      slug: `${product.slug}-ban-sao-${Date.now().toString(36)}`,
      active: false,
      variants: previous.variants?.map((variant) => ({
        ...variant,
        id: crypto.randomUUID(),
      })),
    }));
  }
  async function remove(product: Product) {
    if (
      !window.confirm(
        `Xóa sản phẩm “${product.name}”? Sản phẩm đã có đơn hàng cần được ẩn để giữ lịch sử.`,
      )
    )
      return;
    setDeleting(product.id);
    try {
      await adminRequest(`/api/admin/products/${product.id}`, "DELETE");
      if (editing !== "new" && editing?.id === product.id) setEditing(null);
      toast.success("Đã xóa sản phẩm.");
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setDeleting(null);
    }
  }
  function updateVariant(id: string, changes: Partial<ProductVariant>) {
    update(
      "variants",
      (draft.variants || []).map((variant) =>
        variant.id === id ? { ...variant, ...changes } : variant,
      ),
    );
  }
  function update<K extends keyof ProductDraft>(
    key: K,
    value: ProductDraft[K],
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
          ? "/api/admin/products"
          : `/api/admin/products/${editing.id}`,
        editing === "new" ? "POST" : "PATCH",
        editing === "new"
          ? draft
          : { ...draft, expected_revision: editing.revision ?? 0 },
      );
      toast.success(
        editing === "new" ? "Đã thêm sản phẩm." : "Đã cập nhật sản phẩm.",
      );
      setEditing(null);
      router.refresh();
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  }
  async function uploadMedia(files: FileList | null, kind: "images" | "video") {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (
      kind === "images" &&
      (draft.image_urls?.length || 0) + selected.length > 8
    ) {
      toast.error("Mỗi sản phẩm có tối đa 8 ảnh bổ sung.");
      return;
    }
    const allowed =
      kind === "video"
        ? ["video/mp4", "video/webm"]
        : ["image/jpeg", "image/png", "image/webp"];
    const limit = kind === "video" ? 20_000_000 : 4_000_000;
    if (
      selected.some(
        (file) =>
          !allowed.includes(file.type) || file.size > limit || file.size === 0,
      )
    ) {
      toast.error(
        kind === "video"
          ? "Chọn video MP4 hoặc WebM, tối đa 20 MB."
          : "Chọn ảnh JPG, PNG hoặc WebP, tối đa 4 MB mỗi ảnh.",
      );
      return;
    }
    setUploading(true);
    try {
      for (const file of selected) {
        const body = new FormData();
        body.append("file", file);
        const { url } = await adminRequest("/api/admin/upload", "POST", body);
        setDraft((previous) =>
          kind === "video"
            ? { ...previous, video_url: url }
            : {
                ...previous,
                image_urls: [...(previous.image_urls || []), url],
              },
        );
      }
      toast.success(
        kind === "video" ? "Đã tải video lên." : "Đã thêm ảnh bổ sung.",
      );
    } catch (error) {
      reportError(error);
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-3 left-3 size-4 text-[#7c8774]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên hoặc đường dẫn sản phẩm..."
            className="pl-10"
            aria-label="Tìm sản phẩm"
          />
        </div>
        <Button onClick={() => open("new")} disabled={saving || uploading}>
          <Plus className="size-4" />
          Thêm sản phẩm
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          aria-label="Lọc hiển thị sản phẩm"
          className={fieldClass}
          value={visibility}
          onChange={(event) => setVisibility(event.target.value)}
        >
          <option value="all">Tất cả hiển thị</option>
          <option value="visible">Đang hiển thị</option>
          <option value="hidden">Đã ẩn</option>
        </select>
        <select
          aria-label="Lọc tồn kho"
          className={fieldClass}
          value={stockFilter}
          onChange={(event) => setStockFilter(event.target.value)}
        >
          <option value="all">Tất cả tồn kho</option>
          <option value="out">Hết hàng</option>
          <option value="low">Sắp hết (1–5)</option>
          <option value="available">Còn trên 5</option>
        </select>
        <select
          aria-label="Lọc danh mục"
          className={fieldClass}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="all">Tất cả danh mục</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-[#6b7867]" aria-live="polite">
        {visible.length} sản phẩm · Đã bán tính từ đơn hoàn tất, chưa hoàn tiền.
      </p>
      {editing && (
        <form onSubmit={save} className={panelClass}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {editing === "new" ? "Thêm sản phẩm mới" : "Chỉnh sửa sản phẩm"}
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
              <Label htmlFor="product-name">Tên sản phẩm</Label>
              <Input
                id="product-name"
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                required
                maxLength={160}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-slug">Đường dẫn</Label>
              <Input
                id="product-slug"
                value={draft.slug}
                onChange={(event) => update("slug", event.target.value)}
                placeholder="vi-du-san-pham"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
              <p className="text-xs text-[#7c8774]">
                Chữ thường không dấu, số và dấu gạch ngang.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-category">Danh mục</Label>
              <select
                id="product-category"
                value={draft.category_id}
                onChange={(event) => update("category_id", event.target.value)}
                className={fieldClass}
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-price">Giá (₫)</Label>
                <Input
                  id="product-price"
                  disabled={Boolean(draft.variants?.length)}
                  type="number"
                  min={0}
                  step={1}
                  value={draft.price}
                  onChange={(event) =>
                    update("price", Number(event.target.value))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-stock">Tồn kho</Label>
                <Input
                  id="product-stock"
                  disabled={Boolean(draft.variants?.length)}
                  type="number"
                  min={0}
                  step={1}
                  value={draft.stock}
                  onChange={(event) =>
                    update("stock", Number(event.target.value))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="product-cost">Giá vốn mỗi sản phẩm (₫)</Label>
              <Input
                id="product-cost"
                type="number"
                min={0}
                max={100000000}
                step={1}
                value={draft.cost_price ?? ""}
                onChange={(event) =>
                  update(
                    "cost_price",
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
                placeholder="Bỏ trống khi chưa biết giá vốn"
              />
              <p className="text-xs leading-6 text-[#788273]">
                Chỉ quản trị viên xem được. Áp dụng cho mọi phân loại; mỗi đơn
                mới lưu giá vốn tại thời điểm đặt để tính lãi gộp. Bỏ trống
                nghĩa là chưa có dữ liệu, khác với giá vốn 0₫ đã xác nhận.
              </p>
            </div>
            <div className="space-y-4 md:col-span-2 rounded-xl border border-[#dfe5d8] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium">Màu sắc / phân loại</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={(draft.variants?.length || 0) >= 30}
                  onClick={() =>
                    update("variants", [
                      ...(draft.variants || []),
                      {
                        id: crypto.randomUUID(),
                        name: "",
                        price: draft.price,
                        stock: 0,
                        image_url: "",
                        active: true,
                      },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Thêm phân loại
                </Button>
              </div>
              <p className="text-xs leading-6 text-[#788273]">
                Mỗi phân loại có giá và tồn kho riêng. Khi có phân loại, giá
                chung là giá thấp nhất và tồn kho chung cộng các phân loại đang
                bán. Với sản phẩm đã có đơn, giữ mã phân loại và ẩn mẫu ngừng
                bán; tạo bản sao để đổi cách quản lý tồn kho.
              </p>
              {(draft.variants || []).map((variant, index) => (
                <div
                  key={variant.id}
                  className="grid gap-3 rounded-lg bg-[#f7f8f2] p-3 sm:grid-cols-3"
                >
                  <div>
                    <Label htmlFor={`variant-name-${variant.id}`}>
                      Tên phân loại {index + 1}
                    </Label>
                    <Input
                      id={`variant-name-${variant.id}`}
                      value={variant.name}
                      onChange={(event) =>
                        updateVariant(variant.id, { name: event.target.value })
                      }
                      placeholder="Ví dụ: Chuỗi hồng"
                      required
                      maxLength={80}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`variant-price-${variant.id}`}>
                      Giá (₫)
                    </Label>
                    <Input
                      id={`variant-price-${variant.id}`}
                      type="number"
                      min={0}
                      max={100000000}
                      step={1}
                      value={variant.price}
                      onChange={(event) =>
                        updateVariant(variant.id, {
                          price: Number(event.target.value),
                        })
                      }
                      required
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`variant-stock-${variant.id}`}>
                      Tồn kho
                    </Label>
                    <Input
                      id={`variant-stock-${variant.id}`}
                      type="number"
                      min={0}
                      max={100000}
                      step={1}
                      value={variant.stock}
                      onChange={(event) =>
                        updateVariant(variant.id, {
                          stock: Number(event.target.value),
                        })
                      }
                      required
                      className="mt-2"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Label htmlFor={`variant-image-${variant.id}`}>
                      URL ảnh riêng (bỏ trống để dùng ảnh chung)
                    </Label>
                    <Input
                      id={`variant-image-${variant.id}`}
                      value={variant.image_url}
                      onChange={(event) =>
                        updateVariant(variant.id, {
                          image_url: event.target.value,
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
                    <CheckField
                      label="Đang bán"
                      checked={variant.active}
                      onChange={(active) =>
                        updateVariant(variant.id, { active })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        update(
                          "variants",
                          (draft.variants || []).filter(
                            (item) => item.id !== variant.id,
                          ),
                        )
                      }
                    >
                      <Trash2 className="size-3.5" />
                      Xóa phân loại
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="md:col-span-2">
              <ImageField
                value={draft.image_url}
                onChange={(url) => update("image_url", url)}
                disabled={saving}
                onUploadingChange={setUploading}
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label htmlFor="product-gallery-upload">Ảnh bổ sung</Label>
              <p className="text-xs text-[#788273]">
                Tối đa 8 ảnh JPG, PNG hoặc WebP, 4 MB mỗi ảnh. Khách hàng có thể
                xem các góc khác của sản phẩm.
              </p>
              <div className="flex flex-wrap gap-3">
                {(draft.image_urls || []).map((url, index) => (
                  <div key={`${url}-${index}`} className="relative">
                    <Image
                      src={url}
                      alt={`Ảnh bổ sung ${index + 1}`}
                      width={88}
                      height={88}
                      unoptimized
                      className="size-22 rounded-xl border border-[#dfe5d8] object-cover"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      aria-label={`Xóa ảnh bổ sung ${index + 1}`}
                      className="absolute -top-2 -right-2 size-6 rounded-full"
                      onClick={() =>
                        update(
                          "image_urls",
                          (draft.image_urls || []).filter(
                            (_, i) => i !== index,
                          ),
                        )
                      }
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Input
                id="product-gallery-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={
                  saving || uploading || (draft.image_urls?.length || 0) >= 8
                }
                onChange={(event) => {
                  void uploadMedia(event.target.files, "images");
                  event.target.value = "";
                }}
              />
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label htmlFor="product-video-upload">Video sản phẩm</Label>
              <p className="text-xs text-[#788273]">
                Một video MP4 hoặc WebM, tối đa 20 MB. Video có nút phát và
                không tự phát âm thanh.
              </p>
              {draft.video_url && (
                <div className="space-y-2">
                  <video
                    src={draft.video_url}
                    controls
                    preload="metadata"
                    className="max-h-60 max-w-full rounded-xl"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => update("video_url", "")}
                  >
                    Xóa video
                  </Button>
                </div>
              )}
              <Input
                id="product-video-upload"
                type="file"
                accept="video/mp4,video/webm"
                onChange={(event) => {
                  void uploadMedia(event.target.files, "video");
                  event.target.value = "";
                }}
              />
              {uploading && (
                <p role="status" className="text-sm text-[#426533]">
                  Đang tải tệp lên…
                </p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="product-description">Mô tả</Label>
              <Textarea
                id="product-description"
                rows={5}
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
                required
              />
            </div>
            <div className="flex flex-wrap gap-5 md:col-span-2">
              <CheckField
                label="Hiển thị trên cửa hàng"
                checked={draft.active}
                onChange={(checked) => update("active", checked)}
              />
              <CheckField
                label="Sản phẩm nổi bật"
                checked={draft.featured}
                onChange={(checked) => update("featured", checked)}
              />
              <CheckField
                label="Sản phẩm mới"
                checked={draft.is_new || false}
                onChange={(checked) => update("is_new", checked)}
              />
            </div>
          </fieldset>
          <div className="mt-6 flex gap-3">
            <Button disabled={saving || uploading}>
              {saving ? "Đang lưu..." : "Lưu sản phẩm"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={saving || uploading}
            >
              Hủy
            </Button>
          </div>
        </form>
      )}
      {visible.length === 0 ? (
        <EmptyState>
          {query
            ? "Không tìm thấy sản phẩm phù hợp."
            : "Chưa có sản phẩm. Thêm sản phẩm đầu tiên cho cửa hàng."}
        </EmptyState>
      ) : (
        <div className={`${panelClass} overflow-x-auto`}>
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-[#e8ecdf] text-xs uppercase tracking-wide text-[#77836e]">
              <tr>
                <th className="py-3 font-medium">Sản phẩm</th>
                <th className="font-medium">Giá</th>
                <th className="font-medium">Tồn kho</th>
                <th className="font-medium">Đã bán</th>
                <th className="font-medium">Hiển thị</th>
                <th className="font-medium">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[#edf0e7] last:border-0"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url && (
                        <Image
                          src={product.image_url}
                          width={52}
                          height={52}
                          alt=""
                          unoptimized
                          className="size-13 rounded-lg bg-[#f1f2e8] object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="mt-1 text-xs text-[#7c8774]">
                          {categoryOptions.find(
                            (category) => category.id === product.category_id,
                          )?.name || "Danh mục khác"}
                          {product.featured ? " · Nổi bật" : ""}
                          {product.is_new ? " · Mới" : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    {formatPrice(product.price)}
                  </td>
                  <td
                    className={
                      product.stock === 0
                        ? "text-red-700"
                        : product.stock <= 5
                          ? "text-amber-700"
                          : ""
                    }
                  >
                    {product.stock}
                    <span className="mt-1 block text-xs">
                      {product.stock === 0
                        ? "Hết hàng"
                        : product.stock <= 5
                          ? "Sắp hết"
                          : "Còn hàng"}
                    </span>
                    {product.variants?.length ? (
                      <span className="mt-1 block text-xs text-[#7c8774]">
                        {product.variants.length} phân loại
                      </span>
                    ) : null}
                  </td>
                  <td>{sold[product.id] || 0}</td>
                  <td>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${product.active ? "bg-[#edf3e7] text-[#426533]" : "bg-[#f1f1ef] text-[#7b8174]"}`}
                    >
                      {product.active ? "Đang hiển thị" : "Đã ẩn"}
                    </span>
                  </td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => open(product)}
                      disabled={saving || uploading}
                    >
                      <Pencil className="size-3.5" />
                      Sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicate(product)}
                      disabled={saving || uploading || deleting !== null}
                    >
                      <Copy className="size-3.5" />
                      Nhân bản
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove(product)}
                      disabled={saving || uploading || deleting !== null}
                      className="text-red-700"
                    >
                      <Trash2 className="size-3.5" />
                      {deleting === product.id ? "Đang xóa..." : "Xóa"}
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
