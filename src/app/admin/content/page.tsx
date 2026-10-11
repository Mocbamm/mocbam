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
        description="Thay ảnh, video, banner điện thoại và nội dung cửa hàng mà không cần sửa mã."
      />
      <ContentManager entries={await getAdminContent()} />
    </>
  );
}
