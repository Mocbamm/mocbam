import { getAdminOrders } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { OrderManager } from "@/components/admin/order-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
import { getAdminCustomers } from "@/lib/admin-insights";
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; email?: string }>;
}) {
  if (!(await canRenderAdmin())) return null;
  const { customer: requestedCustomer, email: requestedEmail } =
    await searchParams;
  const customerId =
    requestedCustomer && /^[0-9a-f-]{36}$/i.test(requestedCustomer)
      ? `account:${requestedCustomer}`
      : requestedCustomer;
  const email = requestedEmail?.trim().toLowerCase();
  const [orders, customers] = await Promise.all([
    getAdminOrders(),
    customerId ? getAdminCustomers() : Promise.resolve([]),
  ]);
  const customer = customers.find((item) => item.id === customerId);
  const orderIds = new Set(customer?.orders.map((item) => item.id));
  const filtered = customerId
    ? orders.filter((order) => orderIds.has(order.id))
    : email
      ? orders.filter((order) => order.email.trim().toLowerCase() === email)
      : orders;
  return (
    <>
      <AdminHeading
        title="Đơn hàng"
        description="Theo dõi đơn đặt hàng, thông tin giao nhận và cập nhật tiến độ xử lý."
      />
      <OrderManager
        orders={filtered}
        customerScope={
          customerId
            ? customer?.name ||
              customer?.email ||
              "Khách hàng không còn trong danh sách"
            : email
        }
      />
    </>
  );
}
