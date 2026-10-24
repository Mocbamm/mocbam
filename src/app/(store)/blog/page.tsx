import { getPosts } from "@/lib/catalog";
import { BlogCatalog } from "@/components/store/blog";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({
  title: "Nhật ký Mộc Bàm",
  description:
    "Câu chuyện, cảm hứng và mẹo chăm sóc đồ handmade từ Mộc Bàm: gỗ, hạt, len và những điều nhỏ xinh phía sau mỗi sản phẩm.",
  path: "/blog",
});
export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <div className="store-page store-journal-page">
      <p className="store-eyebrow">Chuyện nhỏ bên hiên</p>
      <h1 className="store-page-title">Nhật ký Mộc Bàm.</h1>
      <p className="store-page-description">
        Một chút cảm hứng, một chút chăm sóc, và những câu chuyện phía sau mỗi
        điều nhỏ xinh.
      </p>
      <BlogCatalog posts={posts} />
    </div>
  );
}
