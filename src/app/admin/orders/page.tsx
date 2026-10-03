import { getAdminOrders } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { OrderManager } from "@/components/admin/order-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
export default async function AdminOrdersPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Đơn hàng"
        description="Theo dõi đơn đặt hàng, thông tin giao nhận và cập nhật tiến độ xử lý."
      />
      <OrderManager orders={await getAdminOrders()} />
    </>
  );
}
