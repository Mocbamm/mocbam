// Inline formatting for editable content (blog posts, policies, About).
// The text stays plain and readable in the editor; the storefront turns these
// marks into elements. No HTML is ever passed through.
//
//   **đậm**   *nghiêng*   {đỏ}chữ đỏ{/đỏ}   [chữ liên kết](/san-pham/abc)
//   "> " at the start of a line indents it one level (up to 4).
//   A backslash keeps the next mark as text: \*

export type RichColor = "đỏ";
export type RichInline =
  | string
  | { type: "strong"; children: RichInline[] }
  | { type: "em"; children: RichInline[] }
  | { type: "color"; color: RichColor; children: RichInline[] }
  | { type: "link"; href: string; external: boolean; children: RichInline[] };

export const richColors: Record<RichColor, string> = { đỏ: "#b42318" };
export const maxIndent = 4;

// Addresses the shop answers on, so a pasted full URL to our own page stays an
// internal link.
const ownHosts = new Set(["mocbam.com", "www.mocbam.com", "mocbam.vercel.app"]);

// Returns a safe href, or null when the address must not become a link.
export function safeHref(raw: string) {
  const url = raw.trim();
  if (!url || /\s/.test(url)) return null;
  if (url.startsWith("#")) return { href: url, external: false };
  if (url.startsWith("/"))
    return /^\/[/\\]/.test(url) ? null : { href: url, external: false };
  if (/^(mailto|tel):[^\s]+$/i.test(url)) return { href: url, external: true };
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    if (ownHosts.has(parsed.hostname))
      return {
        href: `${parsed.pathname}${parsed.search}${parsed.hash}`,
        external: false,
      };
    return { href: parsed.href, external: true };
  } catch {
    return null;
  }
}

// Fills in what people usually leave out when pasting an address.
export function normalizeHref(raw: string) {
  const url = raw.trim();
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(url)) return `https://${url}`;
  return url;
}

export function linkMarkdown(text: string, href: string) {
  const label = text.replace(/[[\]\r\n]/g, " ").trim();
  return `[${label}](${href})`;
}

const linkPattern = /^\[([^\]\n]+)\]\(([^\s)]+)\)/;
const colorPattern = /^\{(đỏ)\}/;

// Finds the closing single "*" for italics, stepping over "**" pairs so bold
// inside italics still works.
function italicEnd(text: string, from: number) {
  for (let index = from; index < text.length; index++) {
    if (text[index] === "\\") index++;
    else if (text[index] === "*") {
      if (text[index + 1] === "*") index++;
      else return index;
    }
  }
  return -1;
}

function unescapedIndex(text: string, mark: string, from: number) {
  for (let index = from; index <= text.length - mark.length; index++) {
    if (text[index] === "\\") index++;
    else if (text.startsWith(mark, index)) return index;
  }
  return -1;
}

export function parseInline(text: string): RichInline[] {
  const nodes: RichInline[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) nodes.push(buffer);
    buffer = "";
  };
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    const char = text[index];
    if (char === "\\" && /^[\\*[\]{}()>#-]$/.test(text[index + 1] || "")) {
      buffer += text[index + 1];
      index += 2;
      continue;
    }
    if (rest.startsWith("**")) {
      let end = unescapedIndex(text, "**", index + 2);
      // In "**a *b***" the italic inside is still open, so the bold closes on
      // the last two stars; in "**a***b*" it closes on the first two.
      if (
        end > 0 &&
        text[end + 2] === "*" &&
        (text.slice(index + 2, end).match(/\*/g) || []).length % 2 === 1
      )
        end++;
      if (end > index + 2) {
        flush();
        nodes.push({
          type: "strong",
          children: parseInline(text.slice(index + 2, end)),
        });
        index = end + 2;
        continue;
      }
    } else if (char === "*" && !/\s/.test(text[index + 1] || " ")) {
      const end = italicEnd(text, index + 1);
      if (end > index + 1) {
        flush();
        nodes.push({
          type: "em",
          children: parseInline(text.slice(index + 1, end)),
        });
        index = end + 1;
        continue;
      }
    }
    const color = colorPattern.exec(rest);
    if (color) {
      const name = color[1] as RichColor;
      const close = `{/${name}}`;
      const end = unescapedIndex(text, close, index + color[0].length);
      if (end > index + color[0].length) {
        flush();
        nodes.push({
          type: "color",
          color: name,
          children: parseInline(text.slice(index + color[0].length, end)),
        });
        index = end + close.length;
        continue;
      }
    }
    const link = char === "[" ? linkPattern.exec(rest) : null;
    const target = link ? safeHref(link[2]) : null;
    if (link && target) {
      flush();
      nodes.push({
        type: "link",
        ...target,
        children: parseInline(link[1]),
      });
      index += link[0].length;
      continue;
    }
    buffer += char;
    index++;
  }
  flush();
  return nodes;
}

// Splits "> > text" into its indent level and the remaining text.
export function lineIndent(line: string) {
  const match = /^((?:>[ \t]?)+)/.exec(line);
  if (!match) return { level: 0, text: line };
  return {
    level: Math.min((match[1].match(/>/g) || []).length, maxIndent),
    text: line.slice(match[1].length),
  };
}

export function inlineText(nodes: RichInline[]): string {
  return nodes
    .map((node) =>
      typeof node === "string" ? node : inlineText(node.children),
    )
    .join("");
}

// The words a reader sees, for search and summaries.
export function plainText(content: string) {
  return content
    .split("\n")
    .map((line) => {
      const { text } = lineIndent(line);
      return inlineText(
        parseInline(text.replace(/^[!@]\[([^\]\n]*)\]\([^\s)]+\)$/, "$1")),
      );
    })
    .join("\n");
}
