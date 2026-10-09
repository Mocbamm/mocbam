import { AdminHeading } from "@/components/admin/admin-shell";
import { canRenderAdmin } from "@/components/admin/admin-access";
import { DiscountManager } from "@/components/admin/discount-manager";
import { getAdminDiscounts } from "@/lib/promotions";
import { getAdminProducts } from "@/lib/catalog";
import { getAdminCustomers } from "@/lib/admin-insights";

export default async function AdminDiscountsPage() {
  if (!(await canRenderAdmin())) return null;
  const [discounts, customers, products] = await Promise.all([
    getAdminDiscounts(),
    getAdminCustomers(),
    getAdminProducts(),
  ]);
  const accounts = customers.flatMap((customer) =>
    customer.user_id
      ? [
          {
            user_id: customer.user_id,
            name: customer.name,
            email: customer.email,
          },
        ]
      : [],
  );
  return (
    <>
      <AdminHeading
        title="Ưu đãi"
        description="Quản lý mã giảm giá, chương trình trên trang chủ và ưu đãi riêng cho khách hàng."
      />
      <DiscountManager
        discounts={discounts}
        customers={accounts}
        products={products}
      />
    </>
  );
}
