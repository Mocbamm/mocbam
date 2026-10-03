"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/types";
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

type ProductDraft = Omit<Product, "id" | "created_at">;
const blank: ProductDraft = {
  name: "",
  slug: "",
  category_id: categoryOptions[0].id,
  price: 0,
  stock: 0,
  image_url: "",
  description: "",
  active: true,
  featured: false,
};
export function ProductManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const visible = products.filter((product) =>
    `${product.name} ${product.slug}`
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
            stock: product.stock,
            image_url: product.image_url,
            description: product.description,
            active: product.active,
            featured: product.featured,
          },
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
        draft,
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
          <fieldset disabled={saving} className="grid gap-5 md:grid-cols-2">
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
            <div className="md:col-span-2">
              <ImageField
                value={draft.image_url}
                onChange={(url) => update("image_url", url)}
                disabled={saving}
                onUploadingChange={setUploading}
              />
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
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    {formatPrice(product.price)}
                  </td>
                  <td className={product.stock === 0 ? "text-red-700" : ""}>
                    {product.stock}
                  </td>
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
