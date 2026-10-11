import type { TrafficRow } from "./traffic-reports";

/** Plain-Vietnamese names for GA4 values; the original value stays visible. */
const notSet = new Set(["", "(not set)", "(none)", "(other)"]);
const searchEngines: Record<string, string> = {
  google: "Google",
  bing: "Bing",
  coccoc: "Cốc Cốc",
  yahoo: "Yahoo",
  duckduckgo: "DuckDuckGo",
};
const sites: [RegExp, string][] = [
  [/(^|\.)(facebook|fb)(\.com|\.me)?$|^fb$|^facebook$/, "Facebook"],
  [/(^|\.)messenger\.com$|^messenger$/, "Messenger"],
  [/(^|\.)instagram\.com$|^instagram$|^ig$/, "Instagram"],
  [/(^|\.)zalo\.(me|vn)$|^zalo$/, "Zalo"],
  [/(^|\.)tiktok\.com$|^tiktok$/, "TikTok"],
  [/(^|\.)youtube\.com$|^youtube$/, "YouTube"],
  [/(^|\.)shopee\.vn$|^shopee$/, "Shopee"],
  [/(^|\.)threads\.(net|com)$|^threads$/, "Threads"],
  [/(^|\.)chatgpt\.com$|^chatgpt(\.com)?$/, "ChatGPT"],
];

export function trafficSourceLabel(value: string) {
  const raw = value.trim();
  if (notSet.has(raw)) return "Không xác định";
  const [sourcePart, mediumPart = ""] = raw.split(" / ");
  const source = sourcePart.trim().toLowerCase();
  const medium = mediumPart.trim().toLowerCase();
  if (source === "(direct)") return "Vào thẳng website";
  const engine = Object.entries(searchEngines).find(
    ([key]) => source === key || source.startsWith(`${key}.`),
  )?.[1];
  const paid = /^(cpc|ppc|paid|paidsocial|paid_social|display|cpm)/.test(
    medium,
  );
  if (engine) return paid ? `${engine} (quảng cáo)` : `${engine} (tìm kiếm)`;
  const site = sites.find(([pattern]) => pattern.test(source))?.[1];
  if (site) return paid ? `${site} (quảng cáo)` : site;
  if (medium === "email") return `${sourcePart.trim()} (email)`;
  if (paid) return `${sourcePart.trim()} (quảng cáo)`;
  if (notSet.has(source)) return "Không xác định";
  return sourcePart.trim();
}

export function deviceLabel(value: string) {
  const device = value.trim().toLowerCase();
  if (device === "mobile") return "Điện thoại";
  if (device === "desktop") return "Máy tính";
  if (device === "tablet") return "Máy tính bảng";
  if (device === "smart tv") return "Tivi thông minh";
  return notSet.has(device) ? "Không xác định" : value;
}

const pageNames: [RegExp, string][] = [
  [/^\/$/, "Trang chủ"],
  [/^\/san-pham\/?$/, "Danh sách sản phẩm"],
  [/^\/san-pham\/.+/, "Trang sản phẩm"],
  [/^\/blog\/?$/, "Blog"],
  [/^\/blog\/.+/, "Bài viết blog"],
  [/^\/chung-toi\/?$/, "Về Mộc Bàm"],
  [/^\/lien-he\/?$/, "Liên hệ"],
  [/^\/chinh-sach/, "Chính sách"],
  [/^\/gio-hang\/?$/, "Giỏ hàng"],
  [/^\/thanh-toan\/?$/, "Thanh toán"],
  [/^\/tim-kiem\/?$/, "Tìm kiếm"],
  [/^\/tai-khoan/, "Tài khoản"],
  [/^\/don-hang/, "Theo dõi đơn hàng"],
];
export function landingPageLabel(value: string) {
  const path = value.trim().split("?")[0];
  if (notSet.has(path)) return "Không xác định";
  return pageNames.find(([pattern]) => pattern.test(path))?.[1] ?? path;
}

export const funnelStepLabels: Record<string, string> = {
  session_start: "Ghé website",
  view_item: "Xem sản phẩm",
  add_to_cart: "Thêm vào giỏ",
  begin_checkout: "Bắt đầu thanh toán",
  order_submitted: "Gửi đơn hàng",
  purchase: "Mua thành công",
  refund: "Hoàn tiền",
};
export function funnelStepLabel(name: string) {
  const event = name.replace(/^\d+\.\s*/, "");
  return funnelStepLabels[event] ?? event;
}

/** 136.4 → "2 phút 16 giây". */
export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (!minutes) return `${rest} giây`;
  return rest ? `${minutes} phút ${rest} giây` : `${minutes} phút`;
}

/**
 * Combine rows that share a friendly name (facebook.com and m.facebook.com are
 * both "Facebook"). Sessions and views add up exactly; users may overlap, so
 * charts that use this only show sessions.
 */
export function groupTrafficRows(
  rows: TrafficRow[],
  label: (name: string) => string,
) {
  const groups = new Map<
    string,
    { label: string; sessions: number; views: number; names: string[] }
  >();
  for (const row of rows) {
    const name = label(row.name);
    const group = groups.get(name) ?? {
      label: name,
      sessions: 0,
      views: 0,
      names: [],
    };
    group.sessions += row.sessions;
    group.views += row.views;
    group.names.push(row.name);
    groups.set(name, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label),
  );
}

/** The step where the largest share of people stop, excluding the last step. */
export function biggestFunnelDrop(
  funnel: { name: string; users: number; completion_rate: number }[] | null,
) {
  if (!funnel || funnel.length < 2) return null;
  let worst: { from: string; to: string; rate: number } | null = null;
  for (let index = 0; index < funnel.length - 1; index++) {
    const step = funnel[index];
    if (!step.users) continue;
    const rate = funnel[index + 1].users / step.users;
    if (!worst || rate < worst.rate)
      worst = {
        from: funnelStepLabel(step.name),
        to: funnelStepLabel(funnel[index + 1].name),
        rate,
      };
  }
  return worst;
}
