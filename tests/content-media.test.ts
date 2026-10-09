import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  contentBlocks,
  isContentMediaUrl,
  mediaMarkdown,
  parseContentMedia,
} from "@/lib/content-media";
import { contentEntry, contentSections } from "@/lib/site-content";
import { postSchema } from "@/lib/validation";
import { Prose } from "@/components/store/content";

const image = "/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg";
const video = "/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.mp4";

describe("editable content media", () => {
  it("round trips image/video blocks and rejects executable or untrusted sources", () => {
    for (const media of [
      { kind: "image" as const, url: image, caption: "Một góc Mộc" },
      { kind: "video" as const, url: video, caption: "Câu chuyện của gỗ" },
    ]) {
      expect(parseContentMedia(mediaMarkdown(media))).toEqual(media);
      expect(
        contentBlocks(`Lời mở đầu\n\n${mediaMarkdown(media)}\n\nLời kết`),
      ).toHaveLength(3);
    }
    for (const url of [
      "javascript:alert(1)",
      "//evil.test/file.jpg",
      "https://evil.test/file.jpg",
      "/api/media/../private.jpg",
      "https://user:secret@project.supabase.co/file.jpg",
    ]) {
      expect(isContentMediaUrl(url, "image")).toBe(false);
      expect(parseContentMedia(`![Ảnh](${url})`)).toBeNull();
    }
    expect(isContentMediaUrl(video, "image")).toBe(false);
    expect(isContentMediaUrl(image, "video")).toBe(false);
  });
  it("renders headings, lists and video controls while escaping HTML", () => {
    const html = renderToStaticMarkup(
      createElement(Prose, {
        content: `## Chăm sóc gỗ\n\n- Giữ khô\n- Lau nhẹ\n\n@[Cách chăm sóc](${video})\n\n<script>alert(1)</script>`,
      }),
    );
    expect(html).toContain("<h2");
    expect(html).toContain("<ul");
    expect(html).toContain('<video src="' + video + '" controls=""');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
  it("supports removed covers and optional videos without permitting outside embeds", () => {
    const post = {
      slug: "cau-chuyen",
      title: "Câu chuyện",
      excerpt: "Lời mở",
      content: "Nội dung",
      image_url: "",
      video_url: video,
      published: true,
    };
    expect(postSchema.safeParse(post).success).toBe(true);
    expect(postSchema.safeParse({ ...post, video_url: "" }).success).toBe(true);
    expect(
      postSchema.safeParse({
        ...post,
        video_url: "https://evil.test/track.mp4",
      }).success,
    ).toBe(false);
  });
  it("keeps saved marketing edits and supplies complete policy/media defaults", () => {
    const custom = {
      key: "home-hero",
      title: "Mùa quà tặng",
      content: "Lời chào mới",
    };
    expect(contentEntry([custom], "home-hero")).toEqual(custom);
    expect(contentEntry([], "returns").content).toMatch(/7 ngày/);
    expect(contentEntry([], "warranty").content).toMatch(/12 tháng/);
    expect(contentEntry([], "returns").content).toMatch(
      /không phải điều kiện bắt buộc/,
    );
    expect(
      contentSections.filter((section) => section.kind === "media"),
    ).toHaveLength(5);
  });
});
