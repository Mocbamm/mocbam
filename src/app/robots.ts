import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Uploaded photos are served from /api/media; Google needs them for
      // image search and product results. The longer rule wins over /api.
      allow: ["/", "/api/media/"],
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
