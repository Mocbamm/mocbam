import { describe, expect, it } from "vitest";
import {
  biggestFunnelDrop,
  deviceLabel,
  formatDuration,
  funnelStepLabel,
  groupTrafficRows,
  landingPageLabel,
  trafficSourceLabel,
} from "@/lib/traffic-labels";
import type { TrafficRow } from "@/lib/traffic-reports";

function row(name: string, sessions: number): TrafficRow {
  return {
    name,
    users: sessions,
    sessions,
    views: sessions * 2,
    engagement_rate: 0.6,
    bounce_rate: 0.4,
    revenue: null,
    successful_orders: null,
  };
}

describe("plain-Vietnamese traffic labels", () => {
  it("names common GA4 source / medium values", () => {
    expect(trafficSourceLabel("(direct) / (none)")).toBe("Vào thẳng website");
    expect(trafficSourceLabel("google / organic")).toBe("Google (tìm kiếm)");
    expect(trafficSourceLabel("google / cpc")).toBe("Google (quảng cáo)");
    expect(trafficSourceLabel("m.facebook.com / referral")).toBe("Facebook");
    expect(trafficSourceLabel("l.facebook.com / referral")).toBe("Facebook");
    expect(trafficSourceLabel("facebook / paid_social")).toBe(
      "Facebook (quảng cáo)",
    );
    expect(trafficSourceLabel("l.instagram.com / referral")).toBe("Instagram");
    expect(trafficSourceLabel("zalo.me / referral")).toBe("Zalo");
    expect(trafficSourceLabel("coccoc / organic")).toBe("Cốc Cốc (tìm kiếm)");
    expect(trafficSourceLabel("newsletter / email")).toBe("newsletter (email)");
    expect(trafficSourceLabel("blog.example.vn / referral")).toBe(
      "blog.example.vn",
    );
    expect(trafficSourceLabel("(not set)")).toBe("Không xác định");
  });

  it("names devices, landing pages and funnel steps", () => {
    expect(deviceLabel("mobile")).toBe("Điện thoại");
    expect(deviceLabel("desktop")).toBe("Máy tính");
    expect(deviceLabel("tablet")).toBe("Máy tính bảng");
    expect(landingPageLabel("/")).toBe("Trang chủ");
    expect(landingPageLabel("/san-pham")).toBe("Danh sách sản phẩm");
    expect(landingPageLabel("/san-pham/gau-moc")).toBe("Trang sản phẩm");
    expect(landingPageLabel("/blog/bai-viet")).toBe("Bài viết blog");
    expect(landingPageLabel("/la-ma")).toBe("/la-ma");
    expect(landingPageLabel("(not set)")).toBe("Không xác định");
    expect(funnelStepLabel("1. session_start")).toBe("Ghé website");
    expect(funnelStepLabel("5. purchase")).toBe("Mua thành công");
    expect(funnelStepLabel("custom_event")).toBe("custom_event");
  });

  it("formats durations for people rather than seconds", () => {
    expect(formatDuration(136.4)).toBe("2 phút 16 giây");
    expect(formatDuration(45)).toBe("45 giây");
    expect(formatDuration(120)).toBe("2 phút");
    expect(formatDuration(Number.NaN)).toBe("0 giây");
  });
});

describe("traffic groupings", () => {
  it("adds sessions of sources that share a friendly name", () => {
    const groups = groupTrafficRows(
      [
        row("facebook.com / referral", 10),
        row("google / organic", 12),
        row("m.facebook.com / referral", 5),
      ],
      trafficSourceLabel,
    );
    expect(groups.map((group) => [group.label, group.sessions])).toEqual([
      ["Facebook", 15],
      ["Google (tìm kiếm)", 12],
    ]);
    expect(groups[0].names).toEqual([
      "facebook.com / referral",
      "m.facebook.com / referral",
    ]);
  });

  it("finds the step where the largest share of people stop", () => {
    expect(
      biggestFunnelDrop([
        { name: "1. session_start", users: 100, completion_rate: 0.6 },
        { name: "2. view_item", users: 60, completion_rate: 0.2 },
        { name: "3. add_to_cart", users: 12, completion_rate: 0.5 },
        { name: "4. begin_checkout", users: 6, completion_rate: 0.5 },
        { name: "5. purchase", users: 3, completion_rate: 0 },
      ]),
    ).toEqual({ from: "Xem sản phẩm", to: "Thêm vào giỏ", rate: 0.2 });
    expect(biggestFunnelDrop(null)).toBeNull();
    expect(
      biggestFunnelDrop([
        { name: "1. session_start", users: 0, completion_rate: 0 },
        { name: "2. view_item", users: 0, completion_rate: 0 },
      ]),
    ).toBeNull();
  });
});
