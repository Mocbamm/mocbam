import type { Discount } from "./types";

// Client-safe pricing helpers for public vouchers. The order transaction in
// Postgres stays the source of truth; these only mirror it for display.
export type ShopSale = Pick<
  Discount,
  | "code"
  | "kind"
  | "value"
  | "min_subtotal"
  | "max_discount"
  | "scope"
  | "product_ids"
  | "ends_at"
>;

export function calculateDiscount(
  discount: Pick<Discount, "kind" | "value" | "max_discount">,
  subtotal: number,
) {
  const amount =
    discount.kind === "percentage"
      ? Math.floor((subtotal * discount.value) / 100)
      : discount.value;
  return Math.min(subtotal, amount, discount.max_discount ?? subtotal);
}

export function toShopSale(discount: Discount): ShopSale {
  return {
    code: discount.code,
    kind: discount.kind,
    value: discount.value,
    min_subtotal: Number(discount.min_subtotal) || 0,
    max_discount: discount.max_discount,
    scope: discount.scope,
    product_ids: discount.product_ids ?? [],
    ends_at: discount.ends_at,
  };
}

function covers(sale: ShopSale, productId: string) {
  return sale.scope === "product"
    ? Boolean(sale.product_ids?.includes(productId))
    : sale.scope !== "private";
}

// Best voucher price for one unit, or null when no public voucher lowers it.
export function salePrice(
  sales: ShopSale[],
  productId: string,
  price: number,
  now = Date.now(),
) {
  let best: { price: number; code: string } | null = null;
  for (const sale of sales) {
    if (!covers(sale, productId) || price < sale.min_subtotal) continue;
    if (sale.ends_at && Date.parse(sale.ends_at) <= now) continue;
    const off = calculateDiscount(sale, price);
    if (off > 0 && (!best || price - off < best.price))
      best = { price: price - off, code: sale.code };
  }
  return best;
}

// Best voucher for a whole cart, mirroring the order transaction's eligibility.
export function cartSale(
  sales: ShopSale[],
  lines: { product_id: string; price: number; quantity: number }[],
  now = Date.now(),
) {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  let best: { code: string; amount: number } | null = null;
  for (const sale of sales) {
    if (sale.ends_at && Date.parse(sale.ends_at) <= now) continue;
    if (subtotal < sale.min_subtotal) continue;
    const eligible = lines
      .filter((l) => covers(sale, l.product_id))
      .reduce((sum, l) => sum + l.price * l.quantity, 0);
    if (eligible <= 0) continue;
    const amount = calculateDiscount(sale, eligible);
    if (amount > 0 && (!best || amount > best.amount))
      best = { code: sale.code, amount };
  }
  return best;
}
