import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  HandHeart,
  Headset,
  Leaf,
  ShoppingBag,
} from "lucide-react";
import {
  getProducts,
  getCategories,
  getPosts,
  getSettings,
  isConfigured,
} from "@/lib/catalog";
import { ContactForm } from "@/components/store/contact";
import { ProductCard } from "@/components/store/products";
import { StoreCarousel } from "@/components/store/carousel";
import { BlogCard } from "@/components/store/blog";
import { PromotionBanner } from "@/components/store/promotions";
import { getPublicPromotions } from "@/lib/promotions";
import { getPageContent } from "@/lib/site-content-server";
import { ContentVisual, Prose } from "@/components/store/content";
import StoreImage from "@/components/store/image";
import { HeroMedia } from "@/components/store/hero-media";
import { contentSections } from "@/lib/site-content";

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
  const hero = content["home-hero"];
  const heroMedia = content["home-hero-media"];
  const intro = content["home-intro"];
  const introMedia = content["home-intro-media"];
  const defaultHero = contentSections.find(
    (section) => section.key === "home-hero",
  )!;
  // The production editor previously saved the exact test pair “tg” / “h”.
  // Keep meaningful CMS copy, while replacing that known test artifact and seed copy.
  const isTestCopy = hero.title.trim() === "tg" && hero.content.trim() === "h";
  const useCampaignCopy = hero.title === defaultHero.title || isTestCopy;
  const showHeroBody =
    !isTestCopy &&
    (hero.title !== defaultHero.title || hero.content !== defaultHero.content);
  const heroTitle = useCampaignCopy
    ? "Gom nét mộc,\ntạo góc xinh."
    : hero.title;
  const featured = [...products].sort(
    (a, b) => Number(b.featured) - Number(a.featured),
  );
  // Keep all eight products available in the carousel, ordered by the owner's flags.
  const categoryMedia: Record<
    string,
    { key: string; copyKey: string; image: string }
  > = {
    "nhan-vat": {
      key: "home-category-characters-media",
      copyKey: "home-category-characters",
      image: "/images/verdant/characters-cutout.webp",
    },
    chuoi: {
      key: "home-category-beads-media",
      copyKey: "home-category-beads",
      image: "/images/verdant/accessories-cutout.webp",
    },
  };
  const heroNote = content["home-hero-note"];
  const defaultNote = contentSections.find(
    (section) => section.key === "home-hero-note",
  )!;
  const customNote =
    heroNote.title !== defaultNote.title ||
    heroNote.content !== defaultNote.content;
  return (
    <>
      <section
        className="store-category-rail store-container"
        aria-label="Khám phá danh mục"
      >
        {categories.map((category) => {
          const media = categoryMedia[category.slug];
          const entry = media ? content[media.key] : undefined;
          const original = entry?.content;
          const isBundled = Boolean(
            original && /^\/images\/product-0[1-8]\.svg$/.test(original),
          );
          const copy = media ? content[media.copyKey] : undefined;
          const seedCopy = media
            ? contentSections.find((section) => section.key === media.copyKey)
            : undefined;
          const label =
            copy && copy.title !== seedCopy?.title ? copy.title : category.name;
          return (
            <Link
              key={category.id}
              href={`/san-pham?danh-muc=${encodeURIComponent(category.slug)}`}
              className="store-category-shortcut"
            >
              {original !== "none" ? (
                <div className="store-category-image">
                  {original && !isBundled && original !== "none" ? (
                    <ContentVisual
                      url={original}
                      alt={entry?.title || category.name}
                      fallbackSrc={media?.image}
                      sizes="160px"
                      controls={false}
                      className="object-contain"
                    />
                  ) : (
                    <StoreImage
                      src={
                        media?.image ||
                        products.find(
                          (product) => product.category_id === category.id,
                        )?.image_url ||
                        "/images/verdant/characters-cutout.webp"
                      }
                      alt=""
                      fill
                      sizes="160px"
                      className="object-contain"
                    />
                  )}
                </div>
              ) : null}
              <h2>{label}</h2>
              {copy && copy.content !== seedCopy?.content ? (
                <p className="store-category-note">{copy.content}</p>
              ) : null}
            </Link>
          );
        })}
      </section>
      <section
        className="store-container store-home-campaign"
        aria-labelledby="home-title"
      >
        <div
          className={`store-home-hero${heroMedia.content === "none" ? " store-home-hero-text" : ""}`}
        >
          <HeroMedia
            desktop={heroMedia}
            mobile={content["home-hero-mobile-media"]}
          />
          <div className="store-home-hero-copy">
            <p>Từ gỗ, với thương yêu</p>
            <h1 id="home-title">{heroTitle}</h1>
            {showHeroBody ? (
              <div className="store-home-hero-description">
                <Prose content={hero.content} />
              </div>
            ) : null}
            <Link href="/san-pham" className="store-button store-button-light">
              <ShoppingBag size={18} strokeWidth={1.5} /> Khám phá sản phẩm
            </Link>
          </div>
        </div>
      </section>
      <section
        className="store-benefits store-container"
        aria-label="Những điều Mộc trân trọng"
      >
        {[
          {
            icon: HandHeart,
            title: customNote ? heroNote.title : "Hoàn thiện thủ công",
            text: customNote ? heroNote.content : "Tỉ mỉ trong từng chi tiết",
          },
          {
            icon: Leaf,
            title: "Mỗi vân gỗ một nét riêng",
            text: "Không cái nào giống cái nào",
          },
          {
            icon: Headset,
            title: "Mộc luôn sẵn lòng hỗ trợ",
            text: "Luôn ở đây, cùng bạn",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="store-benefit">
            <span>
              <Icon size={30} strokeWidth={1.3} />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>
      <PromotionBanner promotions={promotions} products={products} />
      <section className="store-container store-home-products">
        <StoreCarousel
          label="Sản phẩm Mộc Bàm"
          itemCount={featured.length}
          heading={
            <div>
              <p className="store-eyebrow">
                {content["home-featured"].content}
              </p>
              <h2 className="store-section-heading">
                {content["home-featured"].title}
              </h2>
            </div>
          }
          action={
            <Link href="/san-pham" className="store-text-link">
              Xem tất cả
            </Link>
          }
          itemClassName="w-[calc((100%_-_14px)/2)] md:w-[calc((100%_-_48px)/3)] lg:w-[calc((100%_-_72px)/4)]"
        >
          {featured.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              category={
                categories.find(
                  (category) => category.id === product.category_id,
                )?.name
              }
            />
          ))}
        </StoreCarousel>
      </section>
      <section className="store-container store-home-story">
        <div className="store-story-panel">
          {introMedia.content !== "none" ? (
            <div className="store-story-media">
              <ContentVisual
                url={
                  /^\/images\/product-0[1-8]\.svg$/.test(introMedia.content)
                    ? "/images/story.svg"
                    : introMedia.content
                }
                alt={introMedia.title}
                fallbackSrc="/images/verdant/story.webp"
                sizes="(max-width: 768px) 95vw, 50vw"
              />
            </div>
          ) : null}
          <div className="store-story-copy">
            <p className="store-eyebrow">Về Mộc Bàm</p>
            <h2>{intro.title}</h2>
            <Prose content={intro.content} />
            <Link
              href="/chung-toi"
              className="store-button store-button-light-outline"
            >
              Tìm hiểu thêm <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section className="store-container store-home-journal">
        <StoreCarousel
          label="Nhật ký Mộc Bàm"
          itemCount={posts.length}
          heading={
            <div>
              <p className="store-eyebrow">{content["home-journal"].content}</p>
              <h2 className="store-section-heading">
                {content["home-journal"].title}
              </h2>
            </div>
          }
          action={
            <Link href="/blog" className="store-text-link">
              Đọc thêm
            </Link>
          }
          itemClassName="w-full md:w-[calc((100%_-_24px)/2)]"
        >
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} compact />
          ))}
        </StoreCarousel>
      </section>
      <section className="store-container store-home-contact">
        <div>
          <p className="store-eyebrow">Có một điều muốn kể?</p>
          <h2 className="store-section-heading">
            {content["home-contact"].title}
          </h2>
          <Prose content={content["home-contact"].content} />
          <a href={`mailto:${settings.shop_email}`} className="store-text-link">
            {settings.shop_email} <ArrowUpRight size={16} />
          </a>
          <p className="store-contact-location">{settings.shop_address}</p>
        </div>
        <ContactForm configured={isConfigured()} />
      </section>
    </>
  );
}
