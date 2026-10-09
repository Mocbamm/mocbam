import Image from "next/image";
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
}: {
  url: string;
  alt: string;
  className?: string;
  sizes?: string;
  preload?: boolean;
  controls?: boolean;
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
  if (!isContentMediaUrl(url, "image")) return null;
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={className}
    />
  );
}

export function Prose({ content }: { content: string }) {
  return (
    <div className="space-y-5 text-sm leading-8 text-[#737e65]">
      {contentBlocks(content).map((paragraph, index) => {
        const media = parseContentMedia(paragraph);
        if (media)
          return (
            <figure key={index} className="space-y-2">
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
        const heading = /^#{1,3}\s+([\s\S]+)$/.exec(paragraph);
        if (heading)
          return (
            <h2
              key={index}
              className="pt-4 font-serif text-2xl leading-snug text-[#29412d]"
            >
              {heading[1]}
            </h2>
          );
        const lines = paragraph.split("\n");
        if (lines.every((line) => /^-\s+/.test(line)))
          return (
            <ul key={index} className="list-disc space-y-2 pl-5">
              {lines.map((line, item) => (
                <li key={item}>{line.replace(/^-\s+/, "")}</li>
              ))}
            </ul>
          );
        if (lines.every((line) => /^\d+\.\s+/.test(line)))
          return (
            <ol key={index} className="list-decimal space-y-2 pl-5">
              {lines.map((line, item) => (
                <li key={item}>{line.replace(/^\d+\.\s+/, "")}</li>
              ))}
            </ol>
          );
        return (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}
