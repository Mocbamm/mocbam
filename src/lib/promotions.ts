import { requireAdmin } from "./auth";
import { databaseError, HttpError } from "./http";
import { isConfigured } from "./supabase/config";
import { createServerSupabase } from "./supabase/server";
import { createServiceSupabase } from "./supabase/admin";
import type { Discount } from "./types";

export const discountColumns =
  "id,code,title,description,kind,value,min_subtotal,max_discount,starts_at,ends_at,active,public_campaign,scope,product_ids,customer_user_ids,customer_user_id,max_uses,used_count,created_at";

export function discountIsAvailable(
  discount: Discount,
  userId: string | null,
  now = new Date(),
) {
  return (
    discount.active &&
    (!discount.starts_at || new Date(discount.starts_at) <= now) &&
    (!discount.ends_at || new Date(discount.ends_at) > now) &&
    (discount.customer_user_ids?.length
      ? Boolean(userId && discount.customer_user_ids.includes(userId))
      : !discount.customer_user_id || discount.customer_user_id === userId) &&
    (discount.scope !== "private" ||
      Boolean(
        discount.customer_user_id || discount.customer_user_ids?.length,
      )) &&
    (discount.max_uses === null || discount.used_count < discount.max_uses)
  );
}

export function calculateDiscount(discount: Discount, subtotal: number) {
  const amount =
    discount.kind === "percentage"
      ? Math.floor((subtotal * discount.value) / 100)
      : discount.value;
  return Math.min(subtotal, amount, discount.max_discount ?? subtotal);
}

export async function getPublicPromotions(): Promise<Discount[]> {
  if (!isConfigured()) return [];
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("discounts")
    .select(discountColumns)
    .eq("public_campaign", true)
    .eq("active", true)
    .is("customer_user_id", null)
    .order("created_at", { ascending: false });
  if (error) throw databaseError(error);
  return (data as Discount[]).filter((discount) =>
    discountIsAvailable(discount, null),
  );
}

export async function getAdminDiscounts(): Promise<Discount[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("discounts")
    .select(discountColumns)
    .order("created_at", { ascending: false });
  if (error) throw databaseError(error);
  return data as Discount[];
}

// The preview accepts only product IDs/quantities. The order transaction repeats
// pricing and eligibility checks under row locks; a preview never reserves uses.
export async function quoteDiscount(
  code: string,
  items: { product_id: string; variant_id?: string | null; quantity: number }[],
  userId: string | null,
) {
  const db = createServiceSupabase();
  const [{ data: discount, error }, products] = await Promise.all([
    db.from("discounts").select(discountColumns).eq("code", code).maybeSingle(),
    db
      .from("products")
      .select("id,price,stock,active,variants")
      .in(
        "id",
        items.map((item) => item.product_id),
      ),
  ]);
  if (error) throw databaseError(error);
  if (products.error) throw databaseError(products.error);
  if (!discount || !discountIsAvailable(discount as Discount, userId))
    throw new HttpError(
      409,
      "Mã ưu đãi không còn hiệu lực hoặc không áp dụng cho tài khoản này.",
    );
  let subtotal = 0;
  let eligibleSubtotal = 0;
  for (const item of items) {
    const product = products.data?.find((row) => row.id === item.product_id);
    const variants = (product?.variants ?? []) as {
      id: string;
      price: number;
      stock: number;
      active: boolean;
    }[];
    const variant = item.variant_id
      ? variants.find((row) => row.id === item.variant_id)
      : null;
    const price = variant ? Number(variant.price) : Number(product?.price);
    const stock = variant ? variant.stock : product?.stock;
    if (
      !product?.active ||
      (variants.length && (!variant || !variant.active)) ||
      (item.variant_id && !variant) ||
      stock < item.quantity
    )
      throw new HttpError(
        409,
        "Một sản phẩm không còn đủ hàng. Vui lòng cập nhật giỏ hàng.",
      );
    const lineValue = price * item.quantity;
    subtotal += lineValue;
    if (
      discount.scope !== "product" ||
      discount.product_ids?.includes(item.product_id)
    )
      eligibleSubtotal += lineValue;
  }
  if (eligibleSubtotal <= 0)
    throw new HttpError(409, "Giỏ hàng chưa có sản phẩm áp dụng ưu đãi này.");
  if (subtotal < Number(discount.min_subtotal))
    throw new HttpError(409, "Đơn hàng chưa đạt giá trị tối thiểu của ưu đãi.");
  return {
    code: discount.code,
    title: discount.title,
    discount_amount: calculateDiscount(discount as Discount, eligibleSubtotal),
    subtotal,
  };
}
