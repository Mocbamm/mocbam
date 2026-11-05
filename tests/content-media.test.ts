import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  contentBlocks,
  isContentMediaUrl,
  mediaMarkdown,
  parseContentMedia,
} from "@/lib/content-media";
import {
  contentEntry,
  contentSections,
  isEditableContent,
} from "@/lib/site-content";
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
    // The retired warranty row now holds the owner's contact page.
    expect(contentEntry([], "warranty").content).toMatch(/Kết nối với Mộc Bàm/);
    expect(contentEntry([], "returns").content).toMatch(/Hỗ trợ sau mua/);
    expect(
      contentSections.filter((section) => section.kind === "media"),
    ).toHaveLength(8);
    // Rows still holding replaced seed copy show the owner's new wording.
    expect(
      contentEntry(
        [{ key: "home-featured", title: "Nhỏ xinh, đủ thương.", content: "x" }],
        "home-featured",
      ),
    ).toEqual({ key: "home-featured", title: "Sản phẩm nổi bật", content: "x" });
  });
  it("lets admin edit only the brand story, the policies and media", () => {
    const editable = contentSections
      .filter(isEditableContent)
      .map((section) => section.key);
    expect(editable).toContain("about");
    expect(editable).toContain("warranty");
    expect(editable).toContain("home-intro-media");
    expect(editable).not.toContain("home-hero-note");
    expect(editable).not.toContain("about-invitation");
    expect(
      contentSections
        .filter((section) => section.group === "policies")
        .map((section) => section.label),
    ).toEqual([
      "Hướng dẫn mua hàng",
      "Chính sách giao hàng",
      "Phương thức thanh toán",
      "Chính sách đổi trả và hỗ trợ sau mua",
      "Quyền riêng tư",
      "Điều khoản sử dụng",
      "Liên hệ",
    ]);
  });
});
