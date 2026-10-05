import type { Order, OrderStatus } from "./types";

export type ReportOrder = Pick<
  Order,
  | "id"
  | "created_at"
  | "status"
  | "total"
  | "payment_status"
  | "paid_at"
  | "refunded_at"
  | "items"
>;
export type ReportRange = { from: string; to: string };

export function storeDate(value: string | Date) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function reportDateRange(now: Date, days: number): ReportRange {
  const to = storeDate(now);
  const start = new Date(`${to}T00:00:00+07:00`);
  start.setUTCDate(start.getUTCDate() - Math.max(0, days - 1));
  return { from: storeDate(start), to };
}

function within(value: string | null, range: ReportRange) {
  if (!value) return false;
  const date = storeDate(value);
  return Boolean(
    date &&
      (!range.from || date >= range.from) &&
      (!range.to || date <= range.to),
  );
}

export function buildStoreReport(orders: ReportOrder[], range: ReportRange) {
  const selected = orders.filter((order) => within(order.created_at, range));
  const active = selected.filter((order) => order.status !== "cancelled");
  const orderValue = active.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );
  const statusCounts: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
  };
  const daily = new Map<
    string,
    {
      date: string;
      order_count: number;
      order_value: number;
      collected: number;
      refunded: number;
    }
  >();
  function day(timestamp: string) {
    const date = storeDate(timestamp);
    if (!daily.has(date))
      daily.set(date, {
        date,
        order_count: 0,
        order_value: 0,
        collected: 0,
        refunded: 0,
      });
    return daily.get(date)!;
  }
  const products = new Map<
    string,
    { id: string; name: string; quantity: number; line_value: number }
  >();
  for (const order of selected) {
    statusCounts[order.status]++;
    const row = day(order.created_at);
    row.order_count++;
    if (order.status === "cancelled") continue;
    row.order_value += Number(order.total);
    for (const item of order.items ?? []) {
      const product = products.get(item.product_id) ?? {
        id: item.product_id,
        name: item.name,
        quantity: 0,
        line_value: 0,
      };
      product.quantity += item.quantity;
      product.line_value += Number(item.price) * item.quantity;
      products.set(item.product_id, product);
    }
  }
  // Cash events can occur in a different period from when an order was created.
  let collected = 0;
  let refunded = 0;
  for (const order of orders) {
    if (
      order.payment_status !== "awaiting_payment" &&
      within(order.paid_at, range)
    ) {
      collected += Number(order.total);
      day(order.paid_at!).collected += Number(order.total);
    }
    if (
      order.payment_status === "refunded" &&
      within(order.refunded_at, range)
    ) {
      refunded += Number(order.total);
      day(order.refunded_at!).refunded += Number(order.total);
    }
  }
  return {
    order_count: selected.length,
    active_order_count: active.length,
    cancelled_order_count: statusCounts.cancelled,
    completed_order_count: statusCounts.completed,
    order_value: orderValue,
    average_order_value: active.length ? orderValue / active.length : 0,
    awaiting_payment_value: active
      .filter((order) => order.payment_status === "awaiting_payment")
      .reduce((sum, order) => sum + Number(order.total), 0),
    collected,
    refunded,
    net_collected: collected - refunded,
    status_counts: statusCounts,
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    products: [...products.values()].sort(
      (a, b) =>
        b.quantity - a.quantity ||
        b.line_value - a.line_value ||
        a.id.localeCompare(b.id),
    ),
  };
}

export type StoreReport = ReturnType<typeof buildStoreReport>;

/** Prefix formula-looking text as well as quoting delimiters for spreadsheet exports. */
export function csvCell(value: string | number) {
  const text = String(value);
  const safe =
    typeof value === "string" && /^[\s]*[=+@\-\t\r\n]/.test(text)
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function reportCsv(report: StoreReport) {
  const rows: (string | number)[][] = [
    [
      "Ngày (Việt Nam)",
      "Số đơn",
      "Giá trị đơn chưa hủy",
      "Tiền xác nhận",
      "Tiền hoàn",
      "Thu ròng",
    ],
    ...report.daily.map((row) => [
      row.date,
      row.order_count,
      row.order_value,
      row.collected,
      row.refunded,
      row.collected - row.refunded,
    ]),
    [],
    ["Sản phẩm", "Số lượng (đơn chưa hủy)", "Giá trị trước giảm giá"],
    ...report.products.map((row) => [row.name, row.quantity, row.line_value]),
  ];
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
