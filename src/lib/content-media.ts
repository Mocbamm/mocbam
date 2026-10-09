export type ContentMedia = {
  kind: "image" | "video";
  caption: string;
  url: string;
};

export function isContentMediaUrl(url: string, kind: ContentMedia["kind"]) {
  if (kind === "video")
    return /^\/api\/media\/[a-f0-9-]{36}\.(mp4|webm)$/.test(url);
  if (
    /^\/images\/[a-zA-Z0-9._-]+$/.test(url) ||
    /^\/api\/media\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(url)
  )
    return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      /^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname) &&
      !parsed.username &&
      !parsed.password &&
      !/\s/.test(url)
    );
  } catch {
    return false;
  }
}

export function parseContentMedia(block: string): ContentMedia | null {
  const match = /^([!@])\[([^\]\n]*)\]\(([^\s)]+)\)$/.exec(block.trim());
  if (!match) return null;
  const kind = match[1] === "!" ? "image" : "video";
  return isContentMediaUrl(match[3], kind)
    ? { kind, caption: match[2], url: match[3] }
    : null;
}

export function mediaMarkdown(media: ContentMedia) {
  const caption = media.caption.replace(/[\[\]\r\n]/g, " ").trim();
  return `${media.kind === "image" ? "!" : "@"}[${caption}](${media.url})`;
}

export function contentBlocks(content: string) {
  return content.split(/\n\s*\n/).filter((block) => block.trim());
}
