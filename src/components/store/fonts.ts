import localFont from "next/font/local";

// Self-hosted as woff2 cut down to Latin + Vietnamese (and common
// punctuation, ₫, arrows), a third of the full fonts' size: Mali also carries
// Thai and Coiny Tamil, which the site never shows. The full .ttf files stay
// in public/fonts; regenerate with fonttools' pyftsubset (--unicodes
// "U+0000-024F,U+0259,U+02B0-02FF,U+0300-036F,U+1E00-1EFF,U+2000-206F,
// U+20A0-20CF,U+2100-214F,U+2190-21FF,U+2212,U+2215,U+25CC,U+FEFF,U+FFFD"
// --layout-features='*' --name-IDs='*' --notdef-outline --flavor=woff2).
// Owner brief 09/11: Coiny for every heading, in place of the paid
// "Handpicked Seashells". It has a single weight, so pages turn off faux bold
// (font-synthesis-weight) wherever it is used. Be Vietnam Pro, the previous
// heading font, stays in public/fonts.
export const storeHeading = localFont({
  src: [{ path: "../../../public/fonts/coiny-400.woff2", weight: "400" }],
  variable: "--font-store-heading",
  display: "swap",
  preload: false,
});

// Owner trial 06/11: Mali for body text. To go back, point these at the
// cabin-*.ttf files, which stay in public/fonts.
export const storeBody = localFont({
  src: [
    { path: "../../../public/fonts/mali-400.woff2", weight: "400" },
    { path: "../../../public/fonts/mali-500.woff2", weight: "500" },
    { path: "../../../public/fonts/mali-600.woff2", weight: "600" },
    { path: "../../../public/fonts/mali-700.woff2", weight: "700" },
  ],
  variable: "--font-store-body",
  display: "swap",
  preload: false,
});
