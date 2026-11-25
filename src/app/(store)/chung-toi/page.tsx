import { Fragment } from "react";
import Link from "next/link";
import { Leaf, Heart, Hand } from "lucide-react";
import { getPageContent } from "@/lib/site-content-server";
import { ContentVisual, Prose } from "@/components/store/content";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({
  title: "Câu chuyện Mộc Bàm",
  description:
    "Câu chuyện Mộc Bàm: từ tiếng hạt đậu bình an bên trong hạt bàm bàm đến những món decor handmade mang lời chúc bình an. Nét mộc – Tâm an.",
  path: "/chung-toi",
});
export default async function AboutPage() {
  const content = await getPageContent("about");
  const about = content.about;
  const media = content["about-media"];
  // The first line is the heading, anything after it a smaller sentence.
  const [invitationTitle, ...invitationLines] =
    content["about-invitation"].title.split("\n");
  const invitationText = invitationLines.join(" ").trim();
  return (
    <div className="store-page store-about-page">
      {/* Owner feedback 24/11: laid out like a Nhật ký post. The photo has
          the blog cover's size and the same width as the text under it. */}
      {media.content !== "none" ? (
        <div className="store-about-media store-about-banner">
          <ContentVisual
            url={media.content}
            alt={media.title}
            preload
            sizes="(max-width: 1024px) 95vw, 960px"
          />
        </div>
      ) : null}
      <div className="store-about-story">
        {/* One line on wide screens; on phones each side of the dash wraps
            as a unit, so "Nét mộc" never splits across lines. */}
        <h1 className="store-page-title store-about-title">
          {(about?.title || "Mộc Bàm – Nét mộc, tâm an")
            .split(" – ")
            .map((part, index, parts) => (
              <Fragment key={index}>
                {index ? " " : null}
                {/* The dash ends the first line, never starts the next. */}
                <span className="inline-block">
                  {index < parts.length - 1 ? `${part} –` : part}
                </span>
              </Fragment>
            ))}
        </h1>
        <Prose
          content={
            about?.content ||
            "Từ những hạt mộc mạc, gửi trao những lời chúc bình an."
          }
        />
      </div>
      <section
        className="store-about-values"
        aria-label="Những điều Mộc Bàm trân trọng"
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
        <p className="store-section-title">{invitationTitle}</p>
        {invitationText ? (
          <p className="store-about-invitation-text">{invitationText}</p>
        ) : null}
        <Link href="/lien-he" className="store-outline-link mt-6">
          {content["about-invitation"].content}
        </Link>
      </div>
    </div>
  );
}
