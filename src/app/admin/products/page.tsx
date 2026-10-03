import { getAdminProducts } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { ProductManager } from "@/components/admin/product-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
export default async function AdminProductsPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Sản phẩm"
        description="Thêm sản phẩm mới, cập nhật tồn kho và chọn những món nổi bật trên trang chủ."
      />
      <ProductManager products={await getAdminProducts()} />
    </>
  );
}
