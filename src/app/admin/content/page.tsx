import { getAdminContent } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { ContentManager } from "@/components/admin/content-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
export default async function AdminContentPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Nội dung cửa hàng"
        description="Cập nhật lời giới thiệu và các chính sách được hiển thị trên website."
      />
      <ContentManager entries={await getAdminContent()} />
    </>
  );
}
