import type { MetadataRoute } from "next";
import { getCategories, getPosts, getProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/site-url";
import { absoluteUrl, productImages, shareableImage } from "@/lib/seo";
import { policyHref, policyLinks } from "@/components/store/policies";

const pages = [
  "",
  "/san-pham",
  "/chung-toi",
  "/blog",
  "/lien-he",
  "/chinh-sach",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts, categories] = await Promise.all([
    getProducts(),
    getPosts(),
    getCategories(),
  ]);
  // The newest post or product is when the listing pages last changed.
  const latest = (items: { created_at: string }[]) =>
    items
      .map((item) => item.created_at)
      .sort()
      .at(-1);
  const listingDates: Record<string, string | undefined> = {
    "": latest([...products, ...posts]),
    "/san-pham": latest(products),
    "/blog": latest(posts),
  };
  return [
    ...pages.map((path) => ({
      url: `${siteUrl}${path}`,
      ...(listingDates[path] ? { lastModified: listingDates[path] } : {}),
    })),
    ...categories.map((category) => ({
      url: absoluteUrl(
        `/san-pham?danh-muc=${encodeURIComponent(category.slug)}`,
      ),
    })),
    ...policyLinks.map((policy) => ({
      url: absoluteUrl(policyHref(policy.id)),
    })),
    ...products.map((product) => ({
      url: `${siteUrl}/san-pham/${product.slug}`,
      lastModified: product.created_at,
      images: productImages(product).map(absoluteUrl),
    })),
    ...posts.map((post) => {
      const image = shareableImage(post.image_url);
      return {
        url: `${siteUrl}/blog/${post.slug}`,
        lastModified: post.created_at,
        ...(image ? { images: [absoluteUrl(image)] } : {}),
      };
    }),
  ];
}
