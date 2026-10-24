import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  normalizeHref,
  parseInline,
  plainText,
  safeHref,
} from "@/lib/rich-text";
import {
  editLines,
  formattingAt,
  toggleMark,
  type TextEdit,
  indentLines,
  outdentLines,
  toggleWrap,
  togglePrefix,
} from "@/lib/rich-text-edit";
import { postSchema } from "@/lib/validation";
import { Prose } from "@/components/store/content";

const render = (content: string) =>
  renderToStaticMarkup(createElement(Prose, { content }));

describe("rich text formatting", () => {
  it("parses bold, italics, red text and links, including nesting", () => {
    expect(
      parseInline("Gỗ **thật *mộc*** và {đỏ}**quý**{/đỏ} [xem](/san-pham/a)"),
    ).toEqual([
      "Gỗ ",
      {
        type: "strong",
        children: ["thật ", { type: "em", children: ["mộc"] }],
      },
      " và ",
      {
        type: "color",
        color: "đỏ",
        children: [{ type: "strong", children: ["quý"] }],
      },
      " ",
      {
        type: "link",
        href: "/san-pham/a",
        external: false,
        children: ["xem"],
      },
    ]);
    expect(parseInline("*nghiêng **đậm** nữa*")).toEqual([
      {
        type: "em",
        children: ["nghiêng ", { type: "strong", children: ["đậm"] }, " nữa"],
      },
    ]);
  });

  it("leaves stray or escaped marks as text", () => {
    expect(parseInline("2 * 3 * 4")).toEqual(["2 * 3 * 4"]);
    expect(parseInline("\\*không nghiêng\\*")).toEqual(["*không nghiêng*"]);
    expect(parseInline("**chưa đóng")).toEqual(["**chưa đóng"]);
    expect(parseInline("{đỏ}chưa đóng")).toEqual(["{đỏ}chưa đóng"]);
  });

  it("only links to safe addresses", () => {
    for (const bad of [
      "javascript:alert(1)",
      "//evil.test",
      "/\\evil.test",
      "data:text/html,x",
      "https://user:pass@example.com",
    ]) {
      expect(safeHref(bad)).toBeNull();
      expect(parseInline(`[x](${bad})`)).toEqual([`[x](${bad})`]);
    }
    expect(safeHref("https://mocbam.com/blog/a?x=1#y")).toEqual({
      href: "/blog/a?x=1#y",
      external: false,
    });
    expect(safeHref("https://shopee.vn/mocbam")).toEqual({
      href: "https://shopee.vn/mocbam",
      external: true,
    });
    expect(normalizeHref("shopee.vn/mocbam")).toBe("https://shopee.vn/mocbam");
    expect(normalizeHref("/san-pham")).toBe("/san-pham");
  });

  it("renders formatting as elements and never as raw HTML", () => {
    const html = render(
      "Mở **đậm** *nghiêng* {đỏ}đỏ{/đỏ} [móc khóa](/san-pham/moc-khoa) [Shopee](https://shopee.vn/x) <script>alert(1)</script>",
    );
    expect(html).toContain(
      '<strong class="font-semibold text-[#3f3d38]">đậm</strong>',
    );
    expect(html).toContain("<em>nghiêng</em>");
    expect(html).toContain('<span style="color:#b42318">đỏ</span>');
    expect(html).toMatch(
      /<a [^>]*href="\/san-pham\/moc-khoa"[^>]*>móc khóa<\/a>/,
    );
    expect(html).not.toMatch(/href="\/san-pham\/moc-khoa"[^>]*target/);
    expect(html).toMatch(
      /<a href="https:\/\/shopee.vn\/x" target="_blank" rel="noopener noreferrer"/,
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("indents paragraphs, lines, headings and lists", () => {
    const html = render(
      "> Thụt một bậc\n\nDòng thường\n> > dòng thụt hai\n\n> ## Mục **lớn**\n\n> - một\n> - hai",
    );
    expect(html).toContain(
      '<p class="whitespace-pre-line" style="padding-left:2em">Thụt một bậc</p>',
    );
    expect(html).toContain(
      '<div><p class="whitespace-pre-line">Dòng thường</p><p class="whitespace-pre-line" style="padding-left:4em">dòng thụt hai</p></div>',
    );
    expect(html).toMatch(/<h2[^>]*style="padding-left:2em">Mục <strong/);
    expect(html).toMatch(
      /<ul[^>]*style="padding-left:2em"><li>một<\/li><li>hai<\/li>/,
    );
  });

  it("gives search the words without the marks", () => {
    expect(
      plainText(
        "> **Gỗ** {đỏ}mộc{/đỏ} [xem](/blog/a)\n![Ảnh gỗ](/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg)",
      ),
    ).toBe("Gỗ mộc xem\nẢnh gỗ");
  });
});

describe("formatting toolbar edits", () => {
  it("wraps a selection, keeps spaces outside, and toggles back off", () => {
    const value = "Mộc Bàm xinh ";
    const bold = toggleWrap(value, 4, 13, "**", "**", "x");
    expect(bold).toMatchObject({ from: 4, to: 12, text: "**Bàm xinh**" });
    const after = "Mộc **Bàm xinh** ";
    expect(toggleWrap(after, 6, 14, "**", "**", "x")).toMatchObject({
      from: 4,
      to: 16,
      text: "Bàm xinh",
    });
    expect(toggleWrap("ab", 1, 1, "{đỏ}", "{/đỏ}", "chữ đỏ")).toMatchObject({
      text: "{đỏ}chữ đỏ{/đỏ}",
      selectFrom: 5,
      selectTo: 11,
    });
    // Italics inside bold adds marks instead of stripping the bold.
    expect(toggleWrap("**a**", 2, 3, "*", "*", "x").text).toBe("*a*");
  });

  it("indents and outdents whole lines, up to four levels", () => {
    const value = "một\nhai\nba";
    expect(editLines(value, 2, 6, indentLines)).toMatchObject({
      from: 0,
      to: 7,
      text: "> một\n> hai",
    });
    expect(outdentLines(["> > a", ">b", "c"])).toEqual(["> a", "b", "c"]);
    expect(indentLines(["> > > > a", ""])).toEqual(["> > > > a", ""]);
  });

  it("toggles headings and lists as their own paragraph", () => {
    const value = "trước\ntiêu đề\nsau";
    const edit = editLines(
      value,
      7,
      7,
      (lines) => togglePrefix(lines, /^#{1,3}\s+/, () => "## "),
      true,
    );
    const result = value.slice(0, edit.from) + edit.text + value.slice(edit.to);
    expect(result).toBe("trước\n\n## tiêu đề\n\nsau");
    expect(
      togglePrefix(["> ## a", "> ## b"], /^#{1,3}\s+/, () => "## "),
    ).toEqual(["> a", "> b"]);
    expect(
      togglePrefix(["a", "", "- b"], /^\d+\.\s+/, (index) => `${index + 1}. `),
    ).toEqual(["1. a", "", "2. b"]);
  });
});

describe("post dates", () => {
  const post = {
    slug: "bai-viet",
    title: "Bài viết",
    excerpt: "Tóm tắt",
    content: "Nội dung",
    image_url: "",
    published: true,
  };
  it("accepts a past date and refuses future or malformed ones", () => {
    expect(
      postSchema.parse({ ...post, created_at: "2025-03-01T08:30:00.000Z" })
        .created_at,
    ).toBe("2025-03-01T08:30:00.000Z");
    expect(postSchema.parse(post).created_at).toBeUndefined();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    for (const created_at of [future, "hôm qua", "1999-12-31T00:00:00Z"])
      expect(postSchema.safeParse({ ...post, created_at }).success).toBe(false);
  });
});

describe("toolbar output round trips", () => {
  it("parses marks stacked by repeated toolbar clicks", () => {
    expect(parseInline("***cả hai***")).toEqual([
      { type: "strong", children: [{ type: "em", children: ["cả hai"] }] },
    ]);
    expect(parseInline("**a***b*")).toEqual([
      { type: "strong", children: ["a"] },
      { type: "em", children: ["b"] },
    ]);
    expect(parseInline("*thật **mộc***")).toEqual([
      {
        type: "em",
        children: ["thật ", { type: "strong", children: ["mộc"] }],
      },
    ]);
  });
});

describe("toggle formatting at the cursor", () => {
  const apply = (value: string, edit: TextEdit) =>
    value.slice(0, edit.from) + edit.text + value.slice(edit.to);
  const bold = (value: string, start: number, end = start) =>
    toggleMark(
      value,
      start,
      end,
      "**",
      "**",
      formattingAt(value, start, end).marks.find((m) => m.type === "strong"),
    );

  it("switches on at the cursor, then off after typing", () => {
    const on = bold("Mộc ", 4);
    expect(apply("Mộc ", on)).toBe("Mộc ****");
    expect(on.selectFrom).toBe(6);
    // Typed "gỗ" between the marks; the cursor is still inside the bold.
    const typed = "Mộc **gỗ**";
    expect(formattingAt(typed, 8, 8).marks.map((m) => m.type)).toEqual([
      "strong",
    ]);
    const off = bold(typed, 8);
    expect(apply(typed, off)).toBe("Mộc **gỗ**");
    expect(off.selectFrom).toBe(10);
  });

  it("splits formatted text when switched off mid-word or for a selection", () => {
    const value = "**abcd**";
    expect(apply(value, bold(value, 4))).toBe("**ab****cd**");
    const edit = bold(value, 3, 5);
    expect(apply(value, edit)).toBe("**a**bc**d**");
    expect([edit.selectFrom, edit.selectTo]).toEqual([5, 7]);
    expect(apply(value, bold(value, 2, 6))).toBe("abcd");
  });

  it("hides empty pairs and finds marks inside indented lines", () => {
    expect(parseInline("a ****b {đỏ}{/đỏ}c")).toEqual(["a b c"]);
    const value = "dòng\n> ## {đỏ}*x*{/đỏ} [y](/blog)";
    const at = formattingAt(value, value.indexOf("x"), value.indexOf("x"));
    expect(at.marks.map((m) => m.type).sort()).toEqual(["color", "em"]);
    expect(at).toMatchObject({ line: "heading", indent: 1 });
    const link = formattingAt(value, value.length - 9, value.length - 9);
    expect(link.marks[0]).toMatchObject({ type: "link", href: "/blog" });
  });
});
