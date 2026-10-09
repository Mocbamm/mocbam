import Link from "next/link";
import { ArrowUpRight, Leaf, Heart, Sparkles } from "lucide-react";
import {
  getProducts,
  getCategories,
  getPosts,
  getSettings,
  isConfigured,
} from "@/lib/catalog";
import { ContactForm } from "@/components/store/contact";
import { ProductCard } from "@/components/store/products";
import { Button } from "@/components/ui/button";
import { StoreCarousel } from "@/components/store/carousel";
import { BlogCard } from "@/components/store/blog";
import { PromotionBanner } from "@/components/store/promotions";
import { getPublicPromotions } from "@/lib/promotions";
import { getPageContent } from "@/lib/site-content-server";
import { ContentVisual, Prose } from "@/components/store/content";
export default async function HomePage() {
  const [products, categories, posts, content, settings, promotions] =
    await Promise.all([
      getProducts(),
      getCategories(),
      getPosts(),
      getPageContent("home"),
      getSettings(),
      getPublicPromotions(),
    ]);
  const intro = content["home-intro"];
  const hero = content["home-hero"];
  const heroMedia = content["home-hero-media"];
  const introMedia = content["home-intro-media"];
  const featured = [...products].sort(
    (a, b) => Number(b.featured) - Number(a.featured),
  );
  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-12 pt-10 sm:px-8 md:grid-cols-[1fr_1.1fr] md:pb-20 md:pt-14">
        <div className="py-4 md:pr-6">
          <p className="mb-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-[#7b896a]">
            <span className="h-px w-9 bg-[#849477]" /> Từ gỗ, với thương yêu
          </p>
          <h1 className="whitespace-pre-line font-serif text-[clamp(3.6rem,7vw,6.5rem)] leading-[1.03] tracking-[-0.05em] text-[#29412d]">
            {hero.title.split("\n").map((line, index) => (
              <span
                key={index}
                className={index ? "block italic text-[#7e906f]" : "block"}
              >
                {line}
              </span>
            ))}
          </h1>
          <div className="mt-7 max-w-sm">
            <Prose content={hero.content} />
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-7">
            <Button asChild className="h-12 px-7">
              <Link href="/san-pham">
                Tìm điều nhỏ xinh <ArrowUpRight size={16} />
              </Link>
            </Button>
            <Link
              href="/chung-toi"
              className="border-b border-[#b1bba0] pb-1 text-xs text-[#576a4a]"
            >
              Câu chuyện của Mộc
            </Link>
          </div>
          <p className="mt-12 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#8b927c]">
            <Leaf size={13} /> Mộc mạc theo cách của bạn
          </p>
        </div>
        {heroMedia.content !== "none" ? (
          <div className="relative">
            <div className="relative aspect-[1.04] overflow-hidden rounded-t-[42%] bg-[#e4e8d9]">
              <ContentVisual
                url={heroMedia.content}
                alt={heroMedia.title}
                preload
                sizes="(max-width: 768px) 95vw, 50vw"
              />
              <div className="absolute right-5 top-8 flex h-20 w-20 rotate-12 items-center justify-center rounded-full border border-[#596d46]/40 bg-[#f4f4df]/70 text-center text-[9px] uppercase leading-4 tracking-widest text-[#566b43]">
                Nhỏ xinh
                <br />& rất Mộc
              </div>
            </div>
            <div
              className={
                heroMedia.content.endsWith(".mp4") ||
                heroMedia.content.endsWith(".webm")
                  ? "mt-4 flex items-center gap-4 border border-[#d9decd] bg-[#faf9f3] p-4"
                  : "absolute -bottom-5 left-5 right-5 flex items-center gap-4 border border-[#d9decd] bg-[#faf9f3] p-4 md:left-8 md:right-8"
              }
            >
              <span className="font-serif text-3xl text-[#7e906f]">01.</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-[#29412d]">
                  {content["home-hero-note"].title}
                </p>
                <p className="mt-1 text-[10px] text-[#909680]">
                  {content["home-hero-note"].content}
                </p>
              </div>
              <Sparkles size={21} strokeWidth={1} className="text-[#7e906f]" />
            </div>
          </div>
        ) : null}
      </section>
      <div className="mt-4 border-y border-[#dde2d0] bg-[#eef0e5]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-6 text-[11px] text-[#647658] sm:grid-cols-3">
          {[
            { icon: Leaf, text: "Cảm hứng từ những điều tự nhiên" },
            { icon: Heart, text: "Tỉ mỉ trong từng chi tiết nhỏ" },
            { icon: Sparkles, text: "Một chút niềm vui cho mỗi ngày" },
          ].map(({ icon: Icon, text }) => (
            <p key={text} className="flex items-center justify-center gap-3">
              <Icon size={16} strokeWidth={1.3} />
              {text}
            </p>
          ))}
        </div>
      </div>
      <PromotionBanner promotions={promotions} products={products} />
      <section className="mx-auto grid max-w-7xl gap-5 px-5 pt-12 sm:px-8 md:grid-cols-2">
        {[
          {
            slug: "nhan-vat",
            eyebrow: content["home-category-characters"].content,
            title: content["home-category-characters"].title,
            media: content["home-category-characters-media"],
            background: "#e7eadb",
          },
          {
            slug: "chuoi",
            eyebrow: content["home-category-beads"].content,
            title: content["home-category-beads"].title,
            media: content["home-category-beads-media"],
            background: "#e9e4d6",
          },
        ].map((c) => (
          <Link
            key={c.slug}
            href={`/san-pham?danh-muc=${c.slug}`}
            className="group relative grid min-h-64 grid-cols-[1fr_1fr] items-center overflow-hidden p-8 sm:min-h-80 sm:p-10"
            style={{ backgroundColor: c.background }}
          >
            <div className="relative z-10">
              <p className="mb-4 text-[9px] uppercase tracking-[0.2em] text-[#738365]">
                {c.eyebrow}
              </p>
              <h2 className="font-serif text-4xl tracking-tight text-[#29412d]">
                {c.title}
              </h2>
              <span className="mt-6 inline-flex items-center gap-3 border-b border-[#93a280] pb-2 text-xs">
                Khám phá <ArrowUpRight size={14} />
              </span>
            </div>
            <div className="relative aspect-square transition-transform duration-700 group-hover:scale-105">
              <ContentVisual
                url={c.media.content}
                alt={c.media.title}
                controls={false}
                sizes="(max-width: 768px) 45vw, 25vw"
                className="object-contain mix-blend-multiply"
              />
            </div>
          </Link>
        ))}
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
              {content["home-featured"].content}
            </p>
            <h2 className="font-serif text-4xl tracking-[-0.04em] text-[#29412d] sm:text-5xl">
              {content["home-featured"].title}
            </h2>
          </div>
          <Link
            href="/san-pham"
            className="flex items-center gap-3 border-b border-[#aab79c] pb-2 text-xs"
          >
            Xem tất cả <ArrowUpRight size={15} />
          </Link>
        </div>
        <StoreCarousel
          label="Sản phẩm Mộc Bàm"
          itemCount={featured.length}
          itemClassName="w-[calc((100%_-_1.25rem)/2)] lg:w-[calc((100%_-_3.75rem)/4)]"
        >
          {featured.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              category={categories.find((c) => c.id === p.category_id)?.name}
            />
          ))}
        </StoreCarousel>
      </section>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 md:grid-cols-2 md:gap-20">
        {introMedia.content !== "none" ? (
          <div className="relative aspect-[1.1] overflow-hidden bg-[#ecebdc]">
            <ContentVisual
              url={introMedia.content}
              alt={introMedia.title}
              sizes="(max-width: 768px) 90vw, 45vw"
            />
            <span className="absolute bottom-5 left-5 font-serif text-xl italic text-[#546943]">
              Chậm một chút. Mộc một chút.
            </span>
          </div>
        ) : null}
        <div>
          <p className="mb-5 text-[10px] uppercase tracking-[0.24em] text-[#889777]">
            Chào bạn, chúng mình là Mộc Bàm
          </p>
          <h2 className="font-serif text-4xl leading-tight tracking-[-0.04em] text-[#29412d] sm:text-5xl">
            {intro?.title || "Tin rằng niềm vui đến từ điều nhỏ bé."}
          </h2>
          <div className="mt-6">
            <Prose content={intro.content} />
          </div>
          <Link
            href="/chung-toi"
            className="mt-7 inline-flex items-center gap-5 border-b border-[#aab79c] pb-2 text-xs"
          >
            Cùng nghe câu chuyện <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      <section className="bg-[#eef0e6] py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
                {content["home-journal"].content}
              </p>
              <h2 className="font-serif text-4xl tracking-tight text-[#29412d]">
                {content["home-journal"].title}
              </h2>
            </div>
            <Link href="/blog" className="flex items-center gap-3 text-xs">
              Đọc thêm <ArrowUpRight size={15} />
            </Link>
          </div>
          <StoreCarousel
            label="Nhật ký Mộc Bàm"
            itemCount={posts.length}
            itemClassName="w-full md:w-[calc((100%_-_1.25rem)/2)]"
          >
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} compact />
            ))}
          </StoreCarousel>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 pt-16 sm:px-8 md:grid-cols-[1fr_1.3fr] md:pt-20">
        <div>
          <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[#889777]">
            Có một điều muốn kể?
          </p>
          <h2 className="font-serif text-4xl tracking-tight text-[#29412d] sm:text-5xl">
            {content["home-contact"].title}
          </h2>
          <div className="mt-5 max-w-sm">
            <Prose content={content["home-contact"].content} />
          </div>
          <p className="mt-7 text-sm text-[#637a52]">{settings.shop_email}</p>
          <p className="mt-3 text-xs text-[#8b947d]">{settings.shop_address}</p>
        </div>
        <ContactForm configured={isConfigured()} />
      </section>
    </>
  );
}
