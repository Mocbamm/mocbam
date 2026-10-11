import Link from "next/link";
import { HandHeart, Headset, Leaf } from "lucide-react";
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
import { HeroMedia } from "@/components/store/hero-media";
import { HeroSlideshow } from "@/components/store/hero-slideshow";
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
  const heroMedia = content["home-hero-media"];
  const intro = content["home-intro"];
  const introMedia = content["home-intro-media"];
  // Owner feedback 11/10: the banner is an image slideshow with only the two
  // buttons on top. Slides set to “none” are skipped.
  const heroSlides = [
    heroMedia,
    content["home-hero-slide-2-media"],
    content["home-hero-slide-3-media"],
  ].filter((slide) => slide.content !== "none");
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
      image: "/images/verdant/rabbit-photo.webp",
    },
    chuoi: {
      key: "home-category-beads-media",
      copyKey: "home-category-beads",
      image: "/images/verdant/bracelet-photo.webp",
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
        className="store-container store-home-campaign"
        aria-labelledby="home-title"
      >
        <h1 id="home-title" className="sr-only">
          Mộc Bàm – Gom nét mộc, tạo góc xinh
        </h1>
        <div
          className={`store-home-hero${heroSlides.length ? "" : " store-home-hero-text"}`}
        >
          {heroSlides.length ? (
            <HeroSlideshow labels={heroSlides.map((slide) => slide.title)}>
              {heroSlides.map((slide, index) => (
                <HeroMedia
                  key={slide.key}
                  desktop={slide}
                  mobile={
                    index === 0
                      ? content["home-hero-mobile-media"]
                      : { ...slide, content: "none" }
                  }
                  priority={index === 0}
                />
              ))}
            </HeroSlideshow>
          ) : null}
          <div className="store-home-hero-actions">
            <Link href="/san-pham" className="store-button store-button-light">
              Tìm điều nhỏ xinh
            </Link>
            <Link
              href="/chung-toi"
              className="store-button store-button-light-outline"
            >
              Chuyện nhà Mộc Bàm
            </Link>
          </div>
        </div>
      </section>
      <section
        className="store-container store-category-banners"
        aria-label="Danh mục sản phẩm"
      >
        {categories.map((category) => {
          const media = categoryMedia[category.slug];
          const entry = media ? content[media.key] : undefined;
          const copy = media ? content[media.copyKey] : undefined;
          const seedCopy = media
            ? contentSections.find((section) => section.key === media.copyKey)
            : undefined;
          const label =
            copy && copy.title !== seedCopy?.title ? copy.title : category.name;
          const image =
            entry?.content && entry.content !== "none"
              ? entry.content
              : media?.image ||
                products.find((product) => product.category_id === category.id)
                  ?.image_url ||
                "/images/verdant/rabbit-photo.webp";
          return (
            <Link
              key={category.id}
              href={`/san-pham?danh-muc=${encodeURIComponent(category.slug)}`}
              className="store-category-banner"
            >
              <div className="store-category-banner-media">
                <ContentVisual
                  url={image}
                  alt={entry?.title || category.name}
                  fallbackSrc={media?.image}
                  sizes="(max-width: 768px) 95vw, 48vw"
                  controls={false}
                />
              </div>
              <div className="store-category-banner-copy">
                {copy?.content ? <p>{copy.content}</p> : null}
                <h2>{label}</h2>
                <span className="store-button store-button-primary">
                  Khám phá
                </span>
              </div>
            </Link>
          );
        })}
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
            <p className="store-eyebrow">{intro.content}</p>
            <h2>{intro.title}</h2>
            <Link
              href="/chung-toi"
              className="store-button store-button-light-outline"
            >
              Hiểu hơn về Mộc Bàm
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
            {settings.shop_email}
          </a>
          <p className="store-contact-location">{settings.shop_address}</p>
        </div>
        <ContactForm configured={isConfigured()} />
      </section>
    </>
  );
}
