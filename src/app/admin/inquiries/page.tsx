import { getAdminInquiries } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { InquiryManager } from "@/components/admin/inquiry-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
import { getAdminSupportThreads } from "@/lib/support-admin";
import { getAdminOrders } from "@/lib/catalog";
export default async function AdminInquiriesPage() {
  if (!(await canRenderAdmin())) return null;
  const [inquiries, threads, orders] = await Promise.all([
    getAdminInquiries(),
    getAdminSupportThreads(),
    getAdminOrders(),
  ]);
  return (
    <>
      <AdminHeading
        title="Liên hệ từ khách hàng"
        description="Tra cứu khách hàng hoặc mã đơn, trả lời trò chuyện và theo dõi các liên hệ từ biểu mẫu."
      />
      <InquiryManager inquiries={inquiries} threads={threads} orders={orders} />
    </>
  );
}
