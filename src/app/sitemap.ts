import type { MetadataRoute } from "next";
import { getPosts, getProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/site-url";

const pages = [
  "",
  "/san-pham",
  "/chung-toi",
  "/blog",
  "/lien-he",
  "/chinh-sach",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, posts] = await Promise.all([getProducts(), getPosts()]);
  return [
    ...pages.map((path) => ({ url: `${siteUrl}${path}` })),
    ...products.map((product) => ({
      url: `${siteUrl}/san-pham/${product.slug}`,
      lastModified: product.created_at,
    })),
    ...posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.created_at,
    })),
  ];
}
