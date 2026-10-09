import type { Order } from "./types";

/** Only completed, unrefunded orders count as sold inventory. */
export function soldQuantities(
  orders: Pick<Order, "status" | "payment_status" | "items">[],
) {
  const sold: Record<string, number> = {};
  for (const order of orders) {
    if (order.status !== "completed" || order.payment_status === "refunded")
      continue;
    for (const item of order.items || [])
      sold[item.product_id] = (sold[item.product_id] || 0) + item.quantity;
  }
  return sold;
}
