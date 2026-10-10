import { z } from "zod";
import { shippingZoneSchema, shippingDistanceBandsSchema } from "./shipping";

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
const video = z.union([
  z.literal(""),
  z
    .string()
    .max(500)
    .regex(/^\/api\/media\/[a-f0-9-]{36}\.(mp4|webm)$/),
]);
export const discountCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .max(40)
  .regex(
    /^[A-Z0-9_-]*$/,
    "Mã ưu đãi chỉ gồm chữ, số, dấu gạch ngang và gạch dưới.",
  );

export const productSchema = z
  .object({
    slug,
    name: short(),
    category_id: z.uuid(),
    price: money,
    cost_price: money.nullable().optional(),
    stock: z.number().int().min(0).max(100_000),
    image_url: image,
    image_urls: z.array(image).max(8).optional(),
    video_url: video.optional(),
    variants: z
      .array(
        z
          .object({
            id: z.uuid(),
            name: short(80),
            price: money,
            stock: z.number().int().min(0).max(100_000),
            image_url: z.union([z.literal(""), image]),
            active: z.boolean(),
          })
          .strict(),
      )
      .max(30)
      .refine(
        (variants) =>
          new Set(variants.map((variant) => variant.id)).size ===
          variants.length,
        "Mã phân loại không được lặp lại.",
      )
      .optional(),
    description: short(10_000),
    featured: z.boolean(),
    is_new: z.boolean().optional(),
    active: z.boolean(),
  })
  .strict();
export const postSchema = z
  .object({
    slug,
    title: short(),
    excerpt: short(1_000),
    content: short(30_000),
    image_url: z.union([z.literal(""), image]),
    video_url: video.optional(),
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
    shipping_zones: z.array(shippingZoneSchema).max(50).optional(),
    shipping_distance_enabled: z.boolean().optional(),
    shipping_origin_address: z.string().trim().max(500).optional(),
    shipping_distance_bands: shippingDistanceBandsSchema.optional(),
    shop_email: z.email().max(254),
    shop_phone: short(30),
    shop_address: short(500),
    shop_hours: short(200),
    facebook_url: social,
    instagram_url: social,
    tiktok_url: social,
    zalo_url: social.optional(),
    shopee_url: social.optional(),
    bank_transfer_enabled: z.boolean().optional(),
    bank_bin: z
      .union([z.literal(""), z.string().regex(/^[0-9]{6}$/)])
      .optional(),
    bank_name: z.string().trim().max(100).optional(),
    bank_account_number: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9]{5,19}$/),
      ])
      .optional(),
    bank_account_name: z.string().trim().max(100).optional(),
  })
  .strict()
  .superRefine((settings, context) => {
    if (
      settings.shipping_distance_enabled &&
      (!settings.shipping_origin_address ||
        !settings.shipping_distance_bands?.length)
    )
      context.addIssue({
        code: "custom",
        path: ["shipping_distance_enabled"],
        message:
          "Điền địa chỉ gửi hàng và ít nhất một mốc km trước khi bật phí theo khoảng cách.",
      });
    if (
      settings.bank_transfer_enabled &&
      ![
        settings.bank_bin,
        settings.bank_name,
        settings.bank_account_number,
        settings.bank_account_name,
      ].every(Boolean)
    )
      context.addIssue({
        code: "custom",
        path: ["bank_transfer_enabled"],
        message: "Điền đầy đủ tài khoản nhận tiền trước khi bật chuyển khoản.",
      });
  });
export const manualPaymentSchema = z
  .object({
    action: z.enum(["paid", "refunded"]),
    note: short(200),
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
      "returned",
    ]),
    restock: z.boolean().optional(),
  })
  .strict()
  .refine(
    (input) => input.restock === undefined || input.status === "returned",
    { message: "Chỉ chọn cộng tồn kho khi nhận hoàn hàng.", path: ["restock"] },
  );
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
            variant_id: z.uuid().optional(),
            quantity: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1)
      .max(20)
      .refine(
        (items) =>
          new Set(
            items.map((item) => `${item.product_id}:${item.variant_id || ""}`),
          ).size === items.length,
        "Một sản phẩm không được lặp lại.",
      ),
    customer: z
      .object({
        name: short(100),
        email: z.email().trim().max(254),
        phone: short(30).regex(/^[+0-9().\s-]{7,30}$/),
        address: short(500),
        city: short(100),
        ward: optionalText(100).optional(),
        note: optionalText(1_000),
      })
      .strict(),
    idempotency_key: z.uuid(),
    shipping_quote_id: z.uuid().optional(),
    payment_method: z.enum(["cod", "bank_transfer"]).default("cod"),
    discount_code: discountCodeSchema.default(""),
  })
  .strict();

export type OrderInput = z.infer<typeof orderSchema>;

export function canonicalOrderPayload(
  input: OrderInput,
  userId: string | null,
  includePaymentMethod = true,
) {
  return JSON.stringify({
    items: [...input.items].sort((a, b) =>
      `${a.product_id}:${a.variant_id || ""}`.localeCompare(
        `${b.product_id}:${b.variant_id || ""}`,
      ),
    ),
    customer: input.customer,
    user_id: userId,
    ...(includePaymentMethod ? { payment_method: input.payment_method } : {}),
    ...(input.discount_code ? { discount_code: input.discount_code } : {}),
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

export const discountSchema = z
  .object({
    code: discountCodeSchema.min(1),
    title: short(160),
    description: optionalText(1_000),
    kind: z.enum(["percentage", "fixed"]),
    value: z.number().int().min(1).max(100_000_000),
    min_subtotal: money,
    max_discount: money.nullable(),
    starts_at: z.iso.datetime({ offset: true }).nullable(),
    ends_at: z.iso.datetime({ offset: true }).nullable(),
    active: z.boolean(),
    public_campaign: z.boolean(),
    scope: z.enum(["shop", "product", "private"]).optional(),
    product_ids: z.array(z.uuid()).max(200).default([]),
    customer_user_ids: z.array(z.uuid()).max(200).default([]),
    customer_user_id: z.uuid().nullable(),
    max_uses: z.number().int().min(1).max(1_000_000).nullable(),
  })
  .strict()
  .superRefine((discount, context) => {
    const scope =
      discount.scope ?? (discount.customer_user_id ? "private" : "shop");
    if (discount.kind === "percentage" && discount.value > 100)
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "Phần trăm giảm giá tối đa là 100%.",
      });
    if (
      discount.starts_at &&
      discount.ends_at &&
      new Date(discount.ends_at) <= new Date(discount.starts_at)
    )
      context.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "Ngày kết thúc phải sau ngày bắt đầu.",
      });
    if (scope === "product" && !discount.product_ids.length)
      context.addIssue({
        code: "custom",
        path: ["product_ids"],
        message: "Chọn ít nhất một sản phẩm áp dụng.",
      });
    if (scope !== "product" && discount.product_ids.length)
      context.addIssue({
        code: "custom",
        path: ["product_ids"],
        message: "Chỉ ưu đãi sản phẩm được giới hạn sản phẩm.",
      });
    if (
      scope === "private" &&
      !discount.customer_user_id &&
      !discount.customer_user_ids.length
    )
      context.addIssue({
        code: "custom",
        path: ["customer_user_ids"],
        message: "Chọn ít nhất một khách hàng áp dụng.",
      });
    if (
      scope !== "private" &&
      (discount.customer_user_id || discount.customer_user_ids.length)
    )
      context.addIssue({
        code: "custom",
        path: ["customer_user_ids"],
        message: "Chỉ ưu đãi riêng được giới hạn khách hàng.",
      });
    if (discount.customer_user_id && discount.customer_user_ids.length)
      context.addIssue({
        code: "custom",
        path: ["customer_user_ids"],
        message: "Không thể kết hợp hai cách chọn khách hàng.",
      });
    if (
      new Set(discount.product_ids).size !== discount.product_ids.length ||
      new Set(discount.customer_user_ids).size !==
        discount.customer_user_ids.length
    )
      context.addIssue({
        code: "custom",
        path: ["scope"],
        message: "Danh sách áp dụng không được trùng lặp.",
      });
    if (
      discount.public_campaign &&
      (discount.customer_user_id ||
        discount.customer_user_ids.length ||
        scope === "private")
    )
      context.addIssue({
        code: "custom",
        path: ["public_campaign"],
        message: "Ưu đãi riêng cho khách hàng không được hiển thị công khai.",
      });
  })
  .transform((discount) => ({
    ...discount,
    scope:
      discount.scope ??
      (discount.customer_user_id ? ("private" as const) : ("shop" as const)),
  }));

export function videoExtension(
  bytes: Uint8Array,
  mime: string,
): "mp4" | "webm" | null {
  if (
    mime === "video/mp4" &&
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp" &&
    ["isom", "iso2", "mp41", "mp42", "avc1", "M4V "].includes(
      new TextDecoder().decode(bytes.slice(8, 12)),
    )
  )
    return "mp4";
  if (
    mime === "video/webm" &&
    [0x1a, 0x45, 0xdf, 0xa3].every((value, index) => bytes[index] === value) &&
    new TextDecoder().decode(bytes.slice(0, 4096)).includes("webm")
  )
    return "webm";
  return null;
}
