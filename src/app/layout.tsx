import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { Analytics } from "@/components/analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mộc Bàm — Những điều nhỏ, thật riêng",
    template: "%s | Mộc Bàm",
  },
  description:
    "Phụ kiện lấy cảm hứng từ thiên nhiên, dành cho những điều nhỏ mang dấu ấn của bạn. Dự án cửa hàng mẫu Mộc Bàm.",
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
      <body>
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
