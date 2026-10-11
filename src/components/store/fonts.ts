import localFont from "next/font/local";

// Self-host the full Vietnamese character sets. The variables are inert in admin.
export const storeHeading = localFont({
  src: [
    { path: "../../../public/fonts/be-vietnam-pro-400.ttf", weight: "400" },
    { path: "../../../public/fonts/be-vietnam-pro-500.ttf", weight: "500" },
    { path: "../../../public/fonts/be-vietnam-pro-600.ttf", weight: "600" },
    { path: "../../../public/fonts/be-vietnam-pro-700.ttf", weight: "700" },
  ],
  variable: "--font-store-heading",
  display: "swap",
  preload: false,
});

export const storeBody = localFont({
  src: [
    { path: "../../../public/fonts/cabin-400.ttf", weight: "400" },
    { path: "../../../public/fonts/cabin-500.ttf", weight: "500" },
    { path: "../../../public/fonts/cabin-600.ttf", weight: "600" },
    { path: "../../../public/fonts/cabin-700.ttf", weight: "700" },
  ],
  variable: "--font-store-body",
  display: "swap",
  preload: false,
});
