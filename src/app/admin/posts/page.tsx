import { getAdminPosts, getAdminProducts } from "@/lib/catalog";
import { AdminHeading } from "@/components/admin/admin-shell";
import { PostManager } from "@/components/admin/post-manager";
import { canRenderAdmin } from "@/components/admin/admin-access";
export default async function AdminPostsPage() {
  if (!(await canRenderAdmin())) return null;
  const [posts, products] = await Promise.all([
    getAdminPosts(),
    getAdminProducts(),
  ]);
  // Suggestions for linking words to the shop's own pages.
  const linkTargets = [
    ...products
      .filter((product) => product.active)
      .map((product) => ({
        label: `Sản phẩm: ${product.name}`,
        href: `/san-pham/${product.slug}`,
      })),
    ...posts
      .filter((post) => post.published)
      .map((post) => ({
        label: `Bài viết: ${post.title}`,
        href: `/blog/${post.slug}`,
      })),
    { label: "Trang: Tất cả sản phẩm", href: "/san-pham" },
    { label: "Trang: Nhật ký Mộc Bàm", href: "/blog" },
    { label: "Trang: Về Mộc Bàm", href: "/chung-toi" },
    { label: "Trang: Liên hệ", href: "/lien-he" },
  ];
  return (
    <>
      <AdminHeading
        title="Bài viết"
        description="Kể câu chuyện của Mộc Bàm qua những bài viết và chia sẻ nhỏ. Lưu bản nháp hoặc xuất bản khi sẵn sàng."
      />
      <PostManager posts={posts} linkTargets={linkTargets} />
    </>
  );
}
