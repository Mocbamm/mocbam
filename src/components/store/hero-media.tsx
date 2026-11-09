import { getImageProps } from "next/image";
import { isContentMediaUrl } from "@/lib/content-media";
import {
  heroMediaSources,
  storefrontImageSource,
} from "@/lib/storefront-media";
import type { SiteContent } from "@/lib/types";
import { ContentVisual } from "./content";
import StoreImage from "./image";

export function HeroMedia({
  desktop,
  mobile,
  priority = true,
}: {
  desktop: SiteContent;
  mobile: SiteContent;
  priority?: boolean;
}) {
  if (desktop.content === "none") return null;
  const sources = heroMediaSources(desktop.content, mobile.content);
  const desktopShade =
    sources.desktop !== "/images/verdant/hero.webp"
      ? " store-hero-desktop-shade"
      : "";
  const mobileShade =
    sources.mobile !== "/images/verdant/hero-mobile.webp"
      ? " store-hero-mobile-shade"
      : "";
  if (
    isContentMediaUrl(sources.desktop, "image") &&
    isContentMediaUrl(sources.mobile, "image")
  ) {
    // Phones get the resized, compressed copies too; a bare srcSet here sent
    // them the original upload (2.4 MB for the current banner).
    const mobileImage = getImageProps({
      src: storefrontImageSource(sources.mobile),
      alt: "",
      fill: true,
      sizes: "96vw",
    }).props;
    return (
      <picture className={`store-home-hero-media${desktopShade}${mobileShade}`}>
        <source
          media="(max-width: 640px)"
          srcSet={mobileImage.srcSet}
          sizes={mobileImage.sizes}
        />
        <StoreImage
          src={sources.desktop}
          alt={desktop.title}
          fill
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          sizes="(max-width: 1440px) 96vw, 1392px"
          className="object-cover"
        />
      </picture>
    );
  }
  return (
    <>
      <div
        className={`store-home-hero-media store-hero-desktop${desktopShade}`}
      >
        <ContentVisual
          url={sources.desktop}
          alt={desktop.title}
          fallbackSrc="/images/verdant/hero.webp"
          sizes="(max-width: 1440px) 96vw, 1392px"
        />
      </div>
      <div className={`store-home-hero-media store-hero-mobile${mobileShade}`}>
        <ContentVisual
          url={sources.mobile}
          alt={mobile.content === "none" ? desktop.title : mobile.title}
          fallbackSrc="/images/verdant/hero-mobile.webp"
          sizes="96vw"
        />
      </div>
    </>
  );
}
