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

// Owner trial 06/11: Mali for body text. To go back, point these at the
// cabin-*.ttf files, which stay in public/fonts.
export const storeBody = localFont({
  src: [
    { path: "../../../public/fonts/mali-400.ttf", weight: "400" },
    { path: "../../../public/fonts/mali-500.ttf", weight: "500" },
    { path: "../../../public/fonts/mali-600.ttf", weight: "600" },
    { path: "../../../public/fonts/mali-700.ttf", weight: "700" },
  ],
  variable: "--font-store-body",
  display: "swap",
  preload: false,
});
