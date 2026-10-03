import { getAdminPosts } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { PostManager } from "@/components/admin/post-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
export default async function AdminPostsPage() {
  if (!(await canRenderAdmin())) return null;
  return (
    <>
      <AdminHeading
        title="Bài viết"
        description="Kể câu chuyện của Mộc Bàm qua những bài viết và chia sẻ nhỏ. Lưu bản nháp hoặc xuất bản khi sẵn sàng."
      />
      <PostManager posts={await getAdminPosts()} />
    </>
  );
}
