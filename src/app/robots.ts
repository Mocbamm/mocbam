import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or per-visitor pages have nothing worth indexing.
      disallow: [
        "/admin",
        "/api",
        "/auth",
        "/tai-khoan",
        "/gio-hang",
        "/thanh-toan",
        "/don-hang",
        "/tim-kiem",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
