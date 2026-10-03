import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin, HttpError, readJson, safeNext } from "@/lib/http";
import {
  canonicalOrderPayload,
  imageExtension,
  orderSchema,
  postSchema,
  productSchema,
  statusSchema,
} from "@/lib/validation";
import {
  digest,
  matchesReceipt,
  tokenForRequest,
} from "@/lib/supabase/receipts";
import { demoProducts } from "@/lib/demo-data";
import { POST as orderPost } from "@/app/api/orders/route";
import { POST as contactPost } from "@/app/api/contact/route";
import { POST as adminPost } from "@/app/api/admin/[collection]/route";

const input = {
  items: [{ product_id: demoProducts[0].id, quantity: 2 }],
  customer: {
    name: "Khách Mẫu",
    email: "customer@example.com",
    phone: "0901234567",
    address: "12 Đường Mộc",
    city: "TP. Hồ Chí Minh",
    note: "",
  },
  idempotency_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
const request = (body: unknown, origin = "http://localhost:3000") =>
  new Request("http://0.0.0.0:3000/api/orders", {
    method: "POST",
    headers: {
      origin,
      host: "localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("server boundary", () => {
  it("accepts local browser origin using Host rather than the bound dev-server address", () =>
    expect(() => assertSameOrigin(request(input))).not.toThrow());
  it("rejects cross-site requests and missing Origin", () => {
    expect(() =>
      assertSameOrigin(request(input, "https://attacker.example")),
    ).toThrow(HttpError);
    expect(() =>
      assertSameOrigin(new Request("http://localhost:3000")),
    ).toThrow(HttpError);
  });
  it("configured canonical origin takes precedence over spoofed Host", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mocbam.example");
    expect(() => assertSameOrigin(request(input))).toThrow(HttpError);
  });
  it("rejects oversize JSON without trusting Content-Length", async () => {
    await expect(
      readJson(request({ long: "a".repeat(100) }), 20),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("rejects external or backslash OAuth return destinations", () => {
    for (const next of [
      "https://attacker.example",
      "//attacker.example",
      "/\\attacker.example",
      "/auth/login",
      "/\n/attacker.example",
    ])
      expect(safeNext(next)).toBe("/tai-khoan");
    expect(safeNext("/admin?view=orders")).toBe("/admin?view=orders");
  });
  it("returns honest 503 responses for all unconfigured write endpoints", async () => {
    const responses = await Promise.all([
      orderPost(request(input)),
      contactPost(
        request({ name: "A", email: "a@example.com", message: "Help" }),
      ),
      adminPost(request({}), {
        params: Promise.resolve({ collection: "products" }),
      }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(503);
      expect(await response.json()).toHaveProperty("error");
    }
  });
});

describe("input integrity and guest receipts", () => {
  it("rejects client pricing, owner IDs, fractional quantities, duplicates and oversized baskets", () => {
    expect(orderSchema.safeParse({ ...input, total: 1 }).success).toBe(false);
    expect(
      orderSchema.safeParse({ ...input, user_id: "attacker" }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({
        ...input,
        items: [{ ...input.items[0], price: 1 }],
      }).success,
    ).toBe(false);
    for (const quantity of [0, -1, 1.5, 100])
      expect(
        orderSchema.safeParse({
          ...input,
          items: [{ ...input.items[0], quantity }],
        }).success,
      ).toBe(false);
    expect(
      orderSchema.safeParse({
        ...input,
        items: [input.items[0], input.items[0]],
      }).success,
    ).toBe(false);
    expect(
      orderSchema.safeParse({
        ...input,
        items: Array.from({ length: 21 }, () => input.items[0]),
      }).success,
    ).toBe(false);
  });
  it("makes idempotency fingerprints independent of item order and sensitive to quantities and ownership", () => {
    const a = orderSchema.parse({
      ...input,
      items: [...input.items, { product_id: demoProducts[1].id, quantity: 1 }],
    });
    const b = { ...a, items: [...a.items].reverse() };
    expect(canonicalOrderPayload(a, null)).toBe(canonicalOrderPayload(b, null));
    expect(canonicalOrderPayload(a, null)).not.toBe(
      canonicalOrderPayload(a, "owner"),
    );
    expect(canonicalOrderPayload(a, null)).not.toBe(
      canonicalOrderPayload(
        { ...a, items: [{ ...a.items[0], quantity: 3 }] },
        null,
      ),
    );
  });
  it("derives stable opaque guest tokens and verifies only their hashes", () => {
    const token = tokenForRequest(input.idempotency_key, "s".repeat(32));
    expect(token).toHaveLength(43);
    expect(tokenForRequest(input.idempotency_key, "s".repeat(32))).toBe(token);
    expect(tokenForRequest(input.idempotency_key, "t".repeat(32))).not.toBe(
      token,
    );
    expect(matchesReceipt(token, digest(token))).toBe(true);
    expect(
      matchesReceipt(
        token.replace(/^./, token[0] === "A" ? "B" : "A"),
        digest(token),
      ),
    ).toBe(false);
    expect(matchesReceipt(input.idempotency_key, digest(token))).toBe(false);
  });
  it("prevents read-only admin fields and paid status from being patched", () => {
    const { id: _id, created_at: _date, ...product } = demoProducts[0];
    void _id;
    void _date;
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(
      productSchema.partial().safeParse({ id: input.idempotency_key }).success,
    ).toBe(false);
    expect(
      statusSchema.safeParse({ status: "confirmed", payment_status: "paid" })
        .success,
    ).toBe(false);
  });
  it("allows storefront-compatible fixture, upload and Supabase image URLs for products and posts", () => {
    for (const image_url of [
      "/images/product-01.svg",
      "/api/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp",
      "https://demo-project.supabase.co/storage/v1/object/public/catalog/product.png?width=600",
    ]) {
      expect(productSchema.partial().safeParse({ image_url }).success).toBe(
        true,
      );
      expect(postSchema.partial().safeParse({ image_url }).success).toBe(true);
    }
  });
  it("rejects image hosts the storefront cannot render and misleading Supabase URLs", () => {
    for (const image_url of [
      "https://images.example.com/product.png",
      "https://demo-project.supabase.co.attacker.example/product.png",
      "https://attacker.example@demo-project.supabase.co/product.png",
      "https://demo-project.supabase.co@attacker.example/product.png",
      "http://demo-project.supabase.co/product.png",
      "https:/demo-project.supabase.co/product.png",
      "//demo-project.supabase.co/product.png",
      "https://demo-project.supabase.co/product image.png",
      "https://",
    ]) {
      expect(productSchema.partial().safeParse({ image_url }).success).toBe(
        false,
      );
      expect(postSchema.partial().safeParse({ image_url }).success).toBe(false);
    }
  });
  it("requires raster signature to match MIME and rejects SVG", () => {
    expect(
      imageExtension(new Uint8Array([255, 216, 255, 0]), "image/jpeg"),
    ).toBe("jpg");
    expect(
      imageExtension(
        new TextEncoder().encode("<svg onload='alert(1)'/>"),
        "image/png",
      ),
    ).toBeNull();
    expect(
      imageExtension(new TextEncoder().encode("<svg/>"), "image/svg+xml"),
    ).toBeNull();
  });
});
