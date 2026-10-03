import { getAdminInquiries } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { InquiryManager } from "@/components/admin/inquiry-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
export default async function AdminInquiriesPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Liên hệ từ khách hàng"
        description="Đọc lời nhắn, tìm thông tin liên lạc và đánh dấu những yêu cầu đã được xử lý."
      />
      <InquiryManager inquiries={await getAdminInquiries()} />
    </>
  );
}
