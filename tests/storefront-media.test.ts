import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { contentEntry, contentSections } from "@/lib/site-content";
import { isContentMediaUrl } from "@/lib/content-media";
import {
  heroMediaSources,
  storefrontImageSource,
} from "@/lib/storefront-media";
import { HeroMedia } from "@/components/store/hero-media";
import { postSchema } from "@/lib/validation";

const custom = "/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp";
const video = "/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.mp4";
const mobile = "/api/media/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp";

describe("storefront media administration", () => {
  it("shows the actual storefront assets when editing legacy media, preserving custom uploads and hidden sections", () => {
    const legacy = {
      key: "home-hero-media",
      title: "Banner",
      content: "/images/story.svg",
    };
    expect(contentEntry([legacy], legacy.key).content).toBe(
      "/images/verdant/hero.webp",
    );
    for (const content of [custom, video, "none"]) {
      expect(contentEntry([{ ...legacy, content }], legacy.key).content).toBe(
        content,
      );
    }
    expect(
      contentEntry(
        [
          {
            ...legacy,
            key: "home-category-characters-media",
            content: "/images/product-02.svg",
          },
        ],
        "home-category-characters-media",
      ).content,
    ).toBe("/images/verdant/characters-cutout.webp");
    expect(storefrontImageSource(custom)).toBe(custom);
    expect(storefrontImageSource("/images/product-01.svg")).toBe(
      "/images/verdant/cat-photo.webp",
    );
  });

  it("allows bundled nested image paths without traversal, query strings or external hosts", () => {
    for (const section of contentSections.filter(
      (section) => section.kind === "media",
    )) {
      if (section.content !== "none")
        expect(isContentMediaUrl(section.content, "image")).toBe(true);
    }
    for (const url of [
      "/images/..",
      "/images/../private.jpg",
      "/images/verdant/../../private.jpg",
      "/images/%2e%2e/private.jpg",
      "/images/verdant/hero.webp?x=1",
      "//images/verdant/hero.webp",
      "https://evil.test/a.jpg",
    ]) {
      expect(isContentMediaUrl(url, "image")).toBe(false);
    }
    expect(
      postSchema.safeParse({
        slug: "moc",
        title: "Mộc",
        excerpt: "Mộc",
        content: "Mộc",
        image_url: "/images/verdant/story.webp",
        published: true,
      }).success,
    ).toBe(true);
  });

  it("uses a portrait for the default campaign and inherits custom desktop media unless overridden", () => {
    expect(heroMediaSources("/images/story.svg", "none").mobile).toBe(
      "/images/verdant/hero-mobile.webp",
    );
    expect(heroMediaSources(custom, "none")).toEqual({
      desktop: custom,
      mobile: custom,
    });
    expect(heroMediaSources(video, "none")).toEqual({
      desktop: video,
      mobile: video,
    });
    expect(heroMediaSources(custom, mobile)).toEqual({
      desktop: custom,
      mobile,
    });
  });

  it("renders a responsive image source, supports video with a mobile image, and keeps the hide control effective", () => {
    const desktop = {
      key: "home-hero-media",
      title: "Banner",
      content: custom,
    };
    const phone = {
      key: "home-hero-mobile-media",
      title: "Banner điện thoại",
      content: mobile,
    };
    const html = renderToStaticMarkup(
      createElement(HeroMedia, { desktop, mobile: phone }),
    );
    expect(html).toContain(
      `<source media="(max-width: 640px)" srcSet="${mobile}"`,
    );
    const videoHtml = renderToStaticMarkup(
      createElement(HeroMedia, {
        desktop: { ...desktop, content: video },
        mobile: phone,
      }),
    );
    expect(videoHtml).toContain(`src="${video}"`);
    expect(videoHtml).toContain("store-hero-mobile");
    expect(videoHtml).toContain("controls");
    expect(
      renderToStaticMarkup(
        createElement(HeroMedia, {
          desktop: { ...desktop, content: "none" },
          mobile: phone,
        }),
      ),
    ).toBe("");
  });
});
