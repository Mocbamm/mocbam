import { getPosts } from "@/lib/catalog";
import { BlogCatalog } from "@/components/store/blog";
export const metadata = { title: "Nhật ký Mộc Bàm" };
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
