import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Analytics } from "@/components/analytics";
import { storeBody, storeHeading } from "@/components/store/fonts";
import { siteUrl } from "@/lib/site-url";
import { defaultShareImage, siteDescription, siteName } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  openGraph: {
    siteName,
    locale: "vi_VN",
    type: "website",
    images: [defaultShareImage],
  },
  twitter: { card: "summary_large_image" },
  // Google Search Console ownership check, set in the hosting settings.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  robots:
    process.env.VERCEL_ENV === "preview"
      ? { index: false, follow: false }
      : { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={`${storeHeading.variable} ${storeBody.variable}`}>
        {children}
        <Toaster richColors position="top-center" />
        <Suspense fallback={null}>
          <Analytics
            production={process.env.VERCEL_ENV === "production"}
            preview={process.env.VERCEL_ENV === "preview"}
          />
        </Suspense>
      </body>
    </html>
  );
}
