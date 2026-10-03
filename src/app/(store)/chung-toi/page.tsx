import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Leaf, Heart, Hand } from "lucide-react";
import { getSiteContent } from "@/lib/catalog";
import { Prose } from "@/components/store/content";
export const metadata = { title: "Câu chuyện Mộc Bàm" };
export default async function AboutPage() {
  const about = await getSiteContent("about");
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
        <div className="relative aspect-square overflow-hidden rounded-t-[40%] bg-[#e4e8d9]">
          <Image
            src="/images/story.svg"
            alt="Thế giới nhỏ của Mộc Bàm"
            fill
            priority
            sizes="(max-width: 768px) 95vw, 45vw"
            className="object-cover"
          />
        </div>
      </div>
      <section className="mt-16 border-y border-[#dde1d0] py-10">
        <div className="grid gap-10 sm:grid-cols-3">
          {[
            {
              icon: Leaf,
              title: "Tự nhiên",
              text: "Để những đường vân riêng kể câu chuyện của gỗ.",
            },
            {
              icon: Hand,
              title: "Tỉ mỉ",
              text: "Trân trọng từng chi tiết, từ tạo hình đến đóng gói.",
            },
            {
              icon: Heart,
              title: "Ấm áp",
              text: "Những món đồ nhỏ, dành cho bạn và người bạn thương.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon size={24} strokeWidth={1.2} className="text-[#8c9d7a]" />
              <h2 className="mt-5 font-serif text-2xl text-[#29412d]">
                {title}
              </h2>
              <p className="mt-3 max-w-xs text-xs leading-7 text-[#7c866b]">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>
      <div className="py-14 text-center">
        <p className="font-serif text-3xl italic text-[#7c906b]">
          Bạn là một phần câu chuyện của Mộc.
        </p>
        <Link
          href="/lien-he"
          className="mt-6 inline-flex items-center gap-3 border-b border-[#aab79c] pb-2 text-xs"
        >
          Kể chúng mình nghe <ArrowUpRight size={14} />
        </Link>
      </div>
    </main>
  );
}
