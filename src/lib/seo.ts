import type { Metadata } from "next";
import { plainText } from "./rich-text";
import { siteUrl } from "./site-url";
import { storefrontImageSource } from "./storefront-media";
import type { BlogPost, Category, Product, SiteSettings } from "./types";

export const siteName = "Mộc Bàm";
export const siteDescription =
  "Mộc Bàm – phụ kiện handmade lấy cảm hứng từ thiên nhiên: móc khóa, vòng tay, dây chuyền và nhân vật gỗ nhỏ xinh, làm tỉ mỉ từng chi tiết.";
// 1200×630, the size Facebook, Zalo and X expect for link previews.
export const defaultShareImage = {
  url: "/images/share.jpg",
  width: 1200,
  height: 630,
  alt: "Mộc Bàm – phụ kiện handmade từ thiên nhiên",
};

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).href;
}

// A search-result length summary (Google shows roughly 150–160 characters),
// cut at a word boundary.
export function metaDescription(text: string, max = 160) {
  const clean = plainText(text)
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^(-|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

type PageSeo = {
  title: string;
  description: string;
  path: string;
  images?: { url: string; alt?: string }[];
  type?: "website" | "article";
  publishedTime?: string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
};

// Next replaces, rather than merges, a parent's openGraph, so every page
// builds the whole set here.
export function pageMetadata({
  title,
  description,
  path,
  images,
  type = "website",
  publishedTime,
  absoluteTitle,
  noIndex,
}: PageSeo): Metadata {
  const shareImages = images?.length ? images : [defaultShareImage];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url: path,
      siteName,
      locale: "vi_VN",
      type,
      images: shareImages,
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: shareImages.map((image) => image.url),
    },
  };
}

// The photo a visitor actually sees (bundled placeholders show as photos).
// SVGs are skipped: Facebook and Google do not accept them as previews.
export function shareableImage(url?: string) {
  const source = url ? storefrontImageSource(url) : "";
  return source && !source.endsWith(".svg") ? source : "";
}

export function productImages(product: Product) {
  return [product.image_url, ...(product.image_urls || [])]
    .map(shareableImage)
    .filter((url, index, all) => url && all.indexOf(url) === index);
}

const organizationId = `${siteUrl}/#organization`;
const returnPolicyId = `${siteUrl}/#return-policy`;

// Mirrors the “Đổi trả & chăm sóc” policy: 7 days from delivery, sent back
// by post, exchanged or refunded. Shipping is left out on purpose: for
// Vietnam Google only accepts the whole country as a destination, while the
// shop delivers to a few listed wards.
const returnPolicy = {
  "@type": "MerchantReturnPolicy",
  "@id": returnPolicyId,
  applicableCountry: "VN",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 7,
  returnMethod: "https://schema.org/ReturnByMail",
  refundType: [
    "https://schema.org/ExchangeRefund",
    "https://schema.org/FullRefund",
  ],
};

export function organizationJsonLd(settings: SiteSettings) {
  const sameAs = [
    settings.facebook_url,
    settings.instagram_url,
    settings.tiktok_url,
    settings.zalo_url,
    settings.shopee_url,
  ].filter((url): url is string => Boolean(url && /^https:\/\//.test(url)));
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      "@id": organizationId,
      name: siteName,
      url: siteUrl,
      logo: absoluteUrl("/images/logo.png"),
      image: absoluteUrl(defaultShareImage.url),
      description: siteDescription,
      ...(settings.shop_email ? { email: settings.shop_email } : {}),
      ...(settings.shop_phone ? { telephone: settings.shop_phone } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      hasMerchantReturnPolicy: returnPolicy,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
      inLanguage: "vi",
      publisher: { "@id": organizationId },
    },
  ];
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productJsonLd(product: Product, category?: Category) {
  const url = absoluteUrl(`/san-pham/${product.slug}`);
  const variants = (product.variants || []).filter((item) => item.active);
  const options = variants.length
    ? variants
    : [{ price: product.price, stock: product.stock }];
  const prices = options.map((option) => option.price);
  const inStock = options.some((option) => option.stock > 0);
  const availability = `https://schema.org/${inStock ? "InStock" : "OutOfStock"}`;
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const images = productImages(product).map(absoluteUrl);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: metaDescription(product.description, 5000),
    url,
    sku: product.slug,
    ...(images.length ? { image: images } : {}),
    ...(category ? { category: category.name } : {}),
    brand: { "@type": "Brand", name: siteName },
    offers:
      low === high
        ? {
            "@type": "Offer",
            url,
            price: low,
            priceCurrency: "VND",
            availability,
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@id": organizationId },
            hasMerchantReturnPolicy: { "@id": returnPolicyId },
          }
        : {
            "@type": "AggregateOffer",
            url,
            lowPrice: low,
            highPrice: high,
            offerCount: options.length,
            priceCurrency: "VND",
            availability,
            hasMerchantReturnPolicy: { "@id": returnPolicyId },
          },
  };
}

export function postJsonLd(post: BlogPost) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = shareableImage(post.image_url);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: metaDescription(post.excerpt || post.content),
    url,
    mainEntityOfPage: url,
    datePublished: post.created_at,
    inLanguage: "vi",
    image: absoluteUrl(image || defaultShareImage.url),
    author: { "@id": organizationId, "@type": "Organization", name: siteName },
    publisher: { "@id": organizationId },
  };
}
