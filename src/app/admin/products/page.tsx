import { getAdminProducts, getAdminOrders } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { ProductManager } from "@/components/admin/product-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
import { soldQuantities } from "@/lib/inventory-insights";
export default async function AdminProductsPage() {
  if (!(await canRenderAdmin())) return null;
  const [products, orders] = await Promise.all([
    getAdminProducts(),
    getAdminOrders(),
  ]);
  return (
    <>
      <AdminHeading
        title="Sản phẩm"
        description="Thêm sản phẩm mới, cập nhật tồn kho và chọn những món nổi bật trên trang chủ."
      />
      <ProductManager products={products} sold={soldQuantities(orders)} />
    </>
  );
}
