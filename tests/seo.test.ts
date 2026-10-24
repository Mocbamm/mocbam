import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { demoPosts, demoProducts, demoSettings } from "@/lib/demo-data";
import {
  metaDescription,
  organizationJsonLd,
  pageMetadata,
  postJsonLd,
  productImages,
  productJsonLd,
} from "@/lib/seo";
import { JsonLd } from "@/components/store/json-ld";

describe("search descriptions", () => {
  it("strips formatting and cuts long text at a word", () => {
    expect(metaDescription("## Mục\n> **Gỗ** {đỏ}mộc{/đỏ} [xem](/blog)")).toBe(
      "Mục Gỗ mộc xem",
    );
    const long = metaDescription("móc khóa gỗ ".repeat(40));
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long).toMatch(/gỗ…$|khóa…$|móc…$/);
  });

  it("gives every page a canonical address and a full share card", () => {
    const meta = pageMetadata({
      title: "Bài",
      description: "Mô tả",
      path: "/blog/bai",
      type: "article",
      publishedTime: "2026-10-03T00:00:00.000Z",
    });
    expect(meta.alternates?.canonical).toBe("/blog/bai");
    expect(meta.openGraph).toMatchObject({
      url: "/blog/bai",
      siteName: "Mộc Bàm",
      locale: "vi_VN",
      type: "article",
      publishedTime: "2026-10-03T00:00:00.000Z",
      images: [{ url: "/images/share.jpg", width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });
});

describe("structured data", () => {
  it("describes products with price, stock and only real photos", () => {
    const product = {
      ...demoProducts[0],
      image_url: "/images/product-placeholder.svg",
      image_urls: ["/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg"],
      price: 85000,
      stock: 0,
      variants: [],
    };
    expect(productImages(product)).toEqual([
      "/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg",
    ]);
    expect(productJsonLd(product).offers).toMatchObject({
      "@type": "Offer",
      price: 85000,
      priceCurrency: "VND",
      availability: "https://schema.org/OutOfStock",
    });
    const variants = productJsonLd({
      ...product,
      variants: [
        {
          id: "a",
          name: "Nhỏ",
          price: 50000,
          stock: 2,
          image_url: "",
          active: true,
        },
        {
          id: "b",
          name: "Lớn",
          price: 90000,
          stock: 0,
          image_url: "",
          active: true,
        },
        {
          id: "c",
          name: "Ẩn",
          price: 10,
          stock: 9,
          image_url: "",
          active: false,
        },
      ],
    });
    expect(variants.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: 50000,
      highPrice: 90000,
      offerCount: 2,
      availability: "https://schema.org/InStock",
    });
  });

  it("uses the photo shown in place of a bundled placeholder", () => {
    expect(
      productImages({
        ...demoProducts[0],
        image_url: "/images/product-01.svg",
      }),
    ).toEqual(["/images/verdant/cat-photo.webp"]);
  });

  it("describes posts and the shop", () => {
    expect(postJsonLd(demoPosts[0])).toMatchObject({
      "@type": "BlogPosting",
      headline: demoPosts[0].title,
      datePublished: demoPosts[0].created_at,
    });
    const [shop] = organizationJsonLd({
      ...demoSettings,
      facebook_url: "https://facebook.com/mocbam",
      instagram_url: "",
    });
    expect(shop).toMatchObject({
      "@type": "OnlineStore",
      sameAs: ["https://facebook.com/mocbam"],
    });
  });

  it("cannot be broken out of by shop text", () => {
    const html = renderToStaticMarkup(
      createElement(JsonLd, { data: { name: "</script><script>alert(1)" } }),
    );
    expect(html).not.toContain("</script><script>");
    expect(html).toContain("\\u003c/script>");
  });
});
