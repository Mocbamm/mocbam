import { describe, expect, it } from "vitest";
import { calculateDiscount, discountIsAvailable } from "@/lib/promotions";
import {
  canonicalOrderPayload,
  discountCodeSchema,
  discountSchema,
  orderSchema,
  productSchema,
  videoExtension,
} from "@/lib/validation";
import { demoProducts } from "@/lib/demo-data";
import type { Discount } from "@/lib/types";

const promotion: Discount = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  code: "MOC10",
  title: "Ưu đãi Mộc",
  description: "",
  kind: "percentage",
  value: 10,
  min_subtotal: 0,
  max_discount: null,
  starts_at: null,
  ends_at: null,
  active: true,
  public_campaign: true,
  customer_user_id: null,
  max_uses: null,
  used_count: 0,
  created_at: "2026-10-05T00:00:00Z",
};
const request = {
  items: [{ product_id: demoProducts[0].id, quantity: 1 }],
  customer: {
    name: "Khách",
    email: "customer@example.com",
    phone: "0901234567",
    address: "Đường Mộc",
    city: "TP. Hồ Chí Minh",
    note: "",
  },
  idempotency_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
function draft(fields: Partial<Discount> = {}) {
  const {
    id: _id,
    created_at: _date,
    used_count: _count,
    ...input
  } = { ...promotion, ...fields };
  void _id;
  void _date;
  void _count;
  return input;
}

describe("discount validation and preview integrity", () => {
  it("normalizes codes and rejects public personalized campaigns, reversed windows and percentages over 100", () => {
    expect(discountCodeSchema.parse(" moc10 ")).toBe("MOC10");
    expect(discountSchema.safeParse(draft()).success).toBe(true);
    for (const fields of [
      { value: 101 },
      { customer_user_id: promotion.id },
      { starts_at: "2026-10-10T00:00:00Z", ends_at: "2026-10-09T00:00:00Z" },
      { max_uses: 0 },
      { value: 1.5 },
    ])
      expect(discountSchema.safeParse(draft(fields)).success).toBe(false);
    expect(
      discountSchema.safeParse({ ...draft(), used_count: 0 }).success,
    ).toBe(false);
  });
  it("checks exact campaign boundaries, customer eligibility and remaining uses", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(
      discountIsAvailable(
        { ...promotion, starts_at: now.toISOString() },
        null,
        now,
      ),
    ).toBe(true);
    expect(
      discountIsAvailable(
        { ...promotion, ends_at: now.toISOString() },
        null,
        now,
      ),
    ).toBe(false);
    expect(
      discountIsAvailable(
        { ...promotion, max_uses: 1, used_count: 1 },
        null,
        now,
      ),
    ).toBe(false);
    expect(
      discountIsAvailable(
        { ...promotion, customer_user_id: promotion.id },
        null,
        now,
      ),
    ).toBe(false);
    expect(
      discountIsAvailable(
        { ...promotion, customer_user_id: promotion.id },
        promotion.id,
        now,
      ),
    ).toBe(true);
    expect(calculateDiscount({ ...promotion, value: 33 }, 101)).toBe(33);
    expect(calculateDiscount({ ...promotion, max_discount: 10 }, 1000)).toBe(
      10,
    );
    expect(
      calculateDiscount({ ...promotion, kind: "fixed", value: 1000 }, 100),
    ).toBe(100);
  });
  it("preserves no-code legacy payloads while fingerprinting discount choice and rejecting supplied discount amounts", () => {
    const parsed = orderSchema.parse(request);
    expect(canonicalOrderPayload(parsed, null)).not.toContain("discount_code");
    expect(
      canonicalOrderPayload(
        orderSchema.parse({ ...request, discount_code: "moc10" }),
        null,
      ),
    ).toContain('"discount_code":"MOC10"');
    expect(
      orderSchema.safeParse({ ...request, discount_amount: 1000000 }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({ ...request, discount_code: "bad/code" }).success,
    ).toBe(false);
  });
});

describe("bounded product media", () => {
  it("allows eight gallery images and uploaded videos but rejects unknown video URLs", () => {
    const image_urls = Array.from(
      { length: 8 },
      () => demoProducts[0].image_url,
    );
    const video_url = "/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.mp4";
    expect(
      productSchema.partial().safeParse({ image_urls, video_url, is_new: true })
        .success,
    ).toBe(true);
    expect(
      productSchema
        .partial()
        .safeParse({ image_urls: [...image_urls, image_urls[0]] }).success,
    ).toBe(false);
    for (const url of [
      "https://video.example/a.mp4",
      "javascript:alert(1)",
      "/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.svg",
    ])
      expect(
        productSchema.partial().safeParse({ video_url: url }).success,
      ).toBe(false);
  });
  it("does not clear stored media or new flags when a partial product update omits them", () => {
    expect(productSchema.partial().parse({ price: 200000 })).toEqual({
      price: 200000,
    });
  });
  it("requires MP4/WebM container signatures to match declared MIME", () => {
    const mp4 = new Uint8Array([
      0,
      0,
      0,
      24,
      ...new TextEncoder().encode("ftypisom"),
    ]);
    const webm = new Uint8Array([
      0x1a,
      0x45,
      0xdf,
      0xa3,
      ...new TextEncoder().encode("webm"),
    ]);
    expect(videoExtension(mp4, "video/mp4")).toBe("mp4");
    expect(videoExtension(webm, "video/webm")).toBe("webm");
    expect(videoExtension(mp4, "video/webm")).toBeNull();
    expect(
      videoExtension(new TextEncoder().encode("<svg/>"), "video/mp4"),
    ).toBeNull();
    expect(
      videoExtension(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), "video/webm"),
    ).toBeNull();
  });
});
