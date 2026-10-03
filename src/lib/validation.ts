import { z } from "zod";

const short = (max = 200) => z.string().trim().min(1).max(max);
const optionalText = (max = 500) => z.string().trim().max(max).default("");
const money = z.number().int().min(0).max(100_000_000);
const slug = short(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const image = z
  .string()
  .max(500)
  .refine((v) => {
    if (
      /^\/images\/[a-zA-Z0-9._-]+$/.test(v) ||
      /^\/api\/media\/[a-f0-9-]+\.(jpg|png|webp)$/.test(v)
    )
      return true;
    if (!v.startsWith("https://") || /\s/.test(v)) return false;
    try {
      const url = new URL(v);
      return (
        url.protocol === "https:" &&
        /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Chọn ảnh đã tải, /images/... hoặc URL HTTPS từ Supabase.");
const social = z.union([
  z.literal(""),
  z.url().refine((v) => new URL(v).protocol === "https:"),
]);

export const productSchema = z
  .object({
    slug,
    name: short(),
    category_id: z.uuid(),
    price: money,
    stock: z.number().int().min(0).max(100_000),
    image_url: image,
    description: short(10_000),
    featured: z.boolean(),
    active: z.boolean(),
  })
  .strict();
export const postSchema = z
  .object({
    slug,
    title: short(),
    excerpt: short(1_000),
    content: short(30_000),
    image_url: image,
    published: z.boolean(),
  })
  .strict();
export const contentSchema = z
  .object({
    key: short(80).regex(/^[a-z0-9_-]+$/),
    title: short(),
    content: short(30_000),
  })
  .strict();
export const categorySchema = z
  .object({ slug, name: short(), description: optionalText(1_000) })
  .strict();
export const settingsSchema = z
  .object({
    shipping_fee: money,
    shop_email: z.email().max(254),
    shop_phone: short(30),
    shop_address: short(500),
    shop_hours: short(200),
    facebook_url: social,
    instagram_url: social,
    tiktok_url: social,
  })
  .strict();
export const statusSchema = z
  .object({
    status: z.enum([
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "completed",
      "cancelled",
    ]),
  })
  .strict();
export const inquirySchema = z
  .object({
    name: short(100),
    email: z.email().trim().max(254),
    phone: optionalText(30),
    message: short(4_000),
  })
  .strict();
export const inquiryUpdateSchema = z.object({ resolved: z.boolean() }).strict();
export const orderSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            product_id: z.uuid(),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(20)
      .refine(
        (items) =>
          new Set(items.map((item) => item.product_id)).size === items.length,
        "Một sản phẩm không được lặp lại.",
      ),
    customer: z
      .object({
        name: short(100),
        email: z.email().trim().max(254),
        phone: short(30).regex(/^[+0-9().\s-]{7,30}$/),
        address: short(500),
        city: short(100),
        note: optionalText(1_000),
      })
      .strict(),
    idempotency_key: z.uuid(),
  })
  .strict();

export type OrderInput = z.infer<typeof orderSchema>;

export function canonicalOrderPayload(
  input: OrderInput,
  userId: string | null,
) {
  return JSON.stringify({
    items: [...input.items].sort((a, b) =>
      a.product_id.localeCompare(b.product_id),
    ),
    customer: input.customer,
    user_id: userId,
  });
}

export function imageExtension(
  bytes: Uint8Array,
  mime: string,
): "jpg" | "png" | "webp" | null {
  if (
    mime === "image/jpeg" &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "jpg";
  if (
    mime === "image/png" &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  )
    return "png";
  if (
    mime === "image/webp" &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}
