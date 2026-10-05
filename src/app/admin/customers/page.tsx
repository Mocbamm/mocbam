import { canRenderAdmin } from "@/components/admin/admin-access";
import { AdminHeading } from "@/components/admin/admin-shell";
import { CustomerManager } from "@/components/admin/customer-manager";
import { getAdminCustomers } from "@/lib/admin-insights";

export default async function AdminCustomersPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Khách hàng"
        description="Hồ sơ liên hệ và lịch sử mua hàng để chăm sóc khách hàng trong một nơi."
      />
      <CustomerManager customers={await getAdminCustomers()} />
    </>
  );
}
