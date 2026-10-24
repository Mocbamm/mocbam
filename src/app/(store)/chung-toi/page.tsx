import Link from "next/link";
import { Leaf, Heart, Hand } from "lucide-react";
import { getPageContent } from "@/lib/site-content-server";
import { ContentVisual, Prose } from "@/components/store/content";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({
  title: "Câu chuyện Mộc Bàm",
  description:
    "Mộc Bàm làm phụ kiện handmade từ gỗ, hạt và chất liệu tự nhiên, tỉ mỉ từng chi tiết. Đọc câu chuyện và cách chúng mình làm nên mỗi món đồ nhỏ.",
  path: "/chung-toi",
});
export default async function AboutPage() {
  const content = await getPageContent("about");
  const about = content.about;
  const media = content["about-media"];
  return (
    <div className="store-page store-about-page">
      <div className="store-about-intro">
        <div>
          <p className="store-eyebrow">Câu chuyện của chúng mình</p>
          <h1 className="store-page-title">
            {about?.title || "Nhỏ thôi, nhưng có câu chuyện."}
          </h1>
          <div className="mt-7">
            <Prose
              content={
                about?.content ||
                "Mộc Bàm tạo nên những người bạn nhỏ từ gỗ, dành cho những niềm vui giản dị trong đời sống hằng ngày."
              }
            />
          </div>
        </div>
        {media.content !== "none" ? (
          <div className="store-about-media relative aspect-square overflow-hidden">
            <ContentVisual url={media.content} alt={media.title} preload />
          </div>
        ) : null}
      </div>
      <section
        className="store-about-values"
        aria-label="Những điều Mộc trân trọng"
      >
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: Leaf,
              ...content["about-natural"],
            },
            {
              icon: Hand,
              ...content["about-craft"],
            },
            {
              icon: Heart,
              ...content["about-warmth"],
            },
          ].map(({ icon: Icon, title, content: text }) => (
            <div key={title} className="store-value-panel">
              <Icon size={24} strokeWidth={1.2} className="text-[#8c9d7a]" />
              <h2 className="store-panel-title mt-5">{title}</h2>
              <div className="mt-3 max-w-xs">
                <Prose content={text} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="store-about-invitation">
        <p className="store-section-title">
          {content["about-invitation"].title}
        </p>
        <Link href="/lien-he" className="store-outline-link mt-6">
          {content["about-invitation"].content}
        </Link>
      </div>
    </div>
  );
}
