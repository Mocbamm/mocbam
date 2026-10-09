import Link from "next/link";
import { ArrowUpRight, Leaf, Heart, Hand } from "lucide-react";
import { getPageContent } from "@/lib/site-content-server";
import { ContentVisual, Prose } from "@/components/store/content";
export const metadata = { title: "Câu chuyện Mộc Bàm" };
export default async function AboutPage() {
  const content = await getPageContent("about");
  const about = content.about;
  const media = content["about-media"];
  return (
    <main className="mx-auto max-w-7xl px-5 pt-14 sm:px-8">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-20">
        <div>
          <p className="mb-5 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
            Câu chuyện của chúng mình
          </p>
          <h1 className="font-serif text-5xl leading-tight tracking-[-0.04em] text-[#29412d] sm:text-6xl">
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
          <div className="relative aspect-square overflow-hidden rounded-t-[40%] bg-[#e4e8d9]">
            <ContentVisual url={media.content} alt={media.title} preload />
          </div>
        ) : null}
      </div>
      <section className="mt-16 border-y border-[#dde1d0] py-10">
        <div className="grid gap-10 sm:grid-cols-3">
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
            <div key={title}>
              <Icon size={24} strokeWidth={1.2} className="text-[#8c9d7a]" />
              <h2 className="mt-5 font-serif text-2xl text-[#29412d]">
                {title}
              </h2>
              <div className="mt-3 max-w-xs">
                <Prose content={text} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="py-14 text-center">
        <p className="font-serif text-3xl italic text-[#7c906b]">
          {content["about-invitation"].title}
        </p>
        <Link
          href="/lien-he"
          className="mt-6 inline-flex items-center gap-3 border-b border-[#aab79c] pb-2 text-xs"
        >
          {content["about-invitation"].content} <ArrowUpRight size={14} />
        </Link>
      </div>
    </main>
  );
}
