import Link from "next/link";
import type { ReactNode } from "react";
import Image from "./image";
import {
  lineIndent,
  parseInline,
  richColors,
  type RichInline,
} from "@/lib/rich-text";
import {
  contentBlocks,
  isContentMediaUrl,
  parseContentMedia,
} from "@/lib/content-media";

export function ContentVisual({
  url,
  alt,
  className = "object-cover",
  sizes = "(max-width: 768px) 95vw, 45vw",
  preload = false,
  controls = true,
  fallbackSrc,
}: {
  url: string;
  alt: string;
  className?: string;
  sizes?: string;
  preload?: boolean;
  controls?: boolean;
  fallbackSrc?: string;
}) {
  if (isContentMediaUrl(url, "video"))
    return (
      <video
        src={url}
        aria-label={alt}
        controls={controls}
        preload="metadata"
        className={`absolute inset-0 h-full w-full ${className}`}
      />
    );
  if (!isContentMediaUrl(url, "image") && !fallbackSrc) return null;
  return (
    <Image
      src={isContentMediaUrl(url, "image") ? url : fallbackSrc!}
      fallbackSrc={fallbackSrc}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={className}
    />
  );
}

function Inline({ nodes }: { nodes: RichInline[] }): ReactNode {
  return nodes.map((node, index) => {
    if (typeof node === "string") return node;
    const children = <Inline nodes={node.children} />;
    if (node.type === "strong")
      return (
        <strong key={index} className="font-semibold text-[#3f3d38]">
          {children}
        </strong>
      );
    if (node.type === "em") return <em key={index}>{children}</em>;
    if (node.type === "color")
      return (
        <span key={index} style={{ color: richColors[node.color] }}>
          {children}
        </span>
      );
    const className =
      "text-[#2a472b] underline decoration-[#2a472b]/40 underline-offset-4 transition-colors hover:decoration-[#2a472b]";
    return node.external ? (
      <a
        key={index}
        href={node.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    ) : (
      <Link key={index} href={node.href} className={className}>
        {children}
      </Link>
    );
  });
}

function RichLine({ text }: { text: string }) {
  return <Inline nodes={parseInline(text)} />;
}

const indentStyle = (level: number) =>
  level ? { paddingLeft: `${level * 2}em` } : undefined;

function Block({ block }: { block: string }) {
  const media = parseContentMedia(block);
  if (media)
    return (
      <figure className="space-y-2">
        {media.kind === "video" ? (
          <video
            src={media.url}
            controls
            preload="metadata"
            aria-label={media.caption || "Video minh họa"}
            className="w-full rounded-xl bg-[#e8ecdf]"
          />
        ) : (
          <Image
            src={media.url}
            alt={media.caption || "Ảnh minh họa"}
            width={1000}
            height={700}
            sizes="(max-width: 768px) 90vw, 700px"
            className="h-auto w-full rounded-xl"
          />
        )}
        {media.caption ? (
          <figcaption className="text-center text-xs leading-6">
            {media.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  const lines = block.split("\n").map(lineIndent);
  const level = lines[0].level;
  const text = lines.map((line) => line.text).join("\n");
  const heading = /^#{1,3}\s+([\s\S]+)$/.exec(text);
  if (heading)
    return (
      <h2
        className="pt-4 font-serif text-2xl leading-snug text-[#29412d]"
        style={indentStyle(level)}
      >
        <RichLine text={heading[1]} />
      </h2>
    );
  if (lines.every((line) => /^-\s+/.test(line.text)))
    return (
      <ul className="list-disc space-y-2 pl-5" style={indentStyle(level)}>
        {lines.map((line, item) => (
          <li key={item}>
            <RichLine text={line.text.replace(/^-\s+/, "")} />
          </li>
        ))}
      </ul>
    );
  if (lines.every((line) => /^\d+\.\s+/.test(line.text)))
    return (
      <ol className="list-decimal space-y-2 pl-5" style={indentStyle(level)}>
        {lines.map((line, item) => (
          <li key={item}>
            <RichLine text={line.text.replace(/^\d+\.\s+/, "")} />
          </li>
        ))}
      </ol>
    );
  // Lines in one paragraph may sit at different depths; keep each run of
  // equally indented lines together.
  const groups: { level: number; lines: string[] }[] = [];
  for (const line of lines) {
    const last = groups.at(-1);
    if (last && last.level === line.level) last.lines.push(line.text);
    else groups.push({ level: line.level, lines: [line.text] });
  }
  if (groups.length === 1)
    return (
      <p className="whitespace-pre-line" style={indentStyle(level)}>
        <RichLine text={text} />
      </p>
    );
  return (
    <div>
      {groups.map((group, index) => (
        <p
          key={index}
          className="whitespace-pre-line"
          style={indentStyle(group.level)}
        >
          <RichLine text={group.lines.join("\n")} />
        </p>
      ))}
    </div>
  );
}

export function Prose({ content }: { content: string }) {
  return (
    <div className="store-prose space-y-5 text-sm leading-8 text-[#737e65]">
      {contentBlocks(content).map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
