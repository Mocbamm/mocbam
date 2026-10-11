// Resolve only bundled artwork. Uploaded files and saved custom URLs stay intact.
const demoPhotography: Record<string, string> = {
  "/images/product-01.svg": "/images/verdant/cat-photo.webp",
  "/images/product-02.svg": "/images/verdant/rabbit-photo.webp",
  "/images/product-03.svg": "/images/verdant/bear-photo.webp",
  "/images/product-04.svg": "/images/verdant/elephant-photo.webp",
  "/images/product-05.svg": "/images/verdant/bracelet-photo.webp",
  "/images/product-06.svg": "/images/verdant/necklace-photo.webp",
  "/images/product-07.svg": "/images/verdant/house-photo.webp",
  "/images/product-08.svg": "/images/verdant/cloud-photo.webp",
  "/images/story.svg": "/images/verdant/story.webp",
  "/images/blog-01.svg": "/images/verdant/story.webp",
  "/images/blog-02.svg": "/images/verdant/hero.webp",
};

export function storefrontImageSource(url: string) {
  return demoPhotography[url] || url;
}

export function contentMediaSource(key: string, url: string) {
  if (key === "home-hero-media" && url === "/images/story.svg")
    return "/images/verdant/hero.webp";
  if (/^\/images\/product-0[1-8]\.svg$/.test(url)) {
    if (key === "home-category-characters-media")
      return "/images/verdant/characters-cutout.webp";
    if (key === "home-category-beads-media")
      return "/images/verdant/accessories-cutout.webp";
  }
  return storefrontImageSource(url);
}

export function heroMediaSources(desktop: string, mobile: string) {
  const main = contentMediaSource("home-hero-media", desktop);
  return {
    desktop: main,
    mobile:
      mobile && mobile !== "none"
        ? mobile
        : main === "/images/verdant/hero.webp"
          ? "/images/verdant/hero-mobile.webp"
          : main,
  };
}
