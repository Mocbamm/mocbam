import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
    // AVIF is about a fifth smaller than WebP; browsers without it get WebP.
    formats: ["image/avif", "image/webp"],
    // Uploads never change under the same name (each gets a new id) and
    // /api/media answers no-store, so without this the resized copies were
    // rebuilt every minute: 1–3 s per photo. Bundled images in public/ should
    // likewise get a new file name when replaced.
    minimumCacheTTL: 2678400,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/don-hang/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};
export default config;
