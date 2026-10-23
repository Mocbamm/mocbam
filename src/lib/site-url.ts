// The shop's public address, for links that leave the site (sitemap, robots).
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
).origin;
