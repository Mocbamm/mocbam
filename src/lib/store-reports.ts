import type { Order, OrderStatus, PaymentMethod } from "./types";

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
> &
  Partial<
    Pick<
      Order,
      | "subtotal"
      | "shipping_fee"
      | "discount_amount"
      | "payment_method"
      | "return_restocked"
    >
  >;
export type ReportRange = { from: string; to: string };
export type ReportPeriod = "today" | "yesterday" | "week" | "month" | "year";

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
export function reportPeriodRange(
  now: Date,
  period: ReportPeriod,
): ReportRange {
  const to = storeDate(now);
  const start = new Date(`${to}T00:00:00+07:00`);
  if (period === "yesterday") {
    start.setUTCDate(start.getUTCDate() - 1);
    return { from: storeDate(start), to: storeDate(start) };
  }
  if (period === "week") {
    const weekday = new Date(`${to}T12:00:00Z`).getUTCDay();
    start.setUTCDate(start.getUTCDate() - ((weekday + 6) % 7));
  }
  return {
    from:
      period === "month"
        ? `${to.slice(0, 7)}-01`
        : period === "year"
          ? `${to.slice(0, 4)}-01-01`
          : storeDate(start),
    to,
  };
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
function subtotal(order: ReportOrder) {
  return Number(
    order.subtotal ??
      (order.items ?? []).reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0,
      ),
  );
}
function merchandiseNet(order: ReportOrder) {
  return Math.max(0, subtotal(order) - Number(order.discount_amount ?? 0));
}

function snapshotCost(order: ReportOrder): number | null {
  if (!order.items?.length) return subtotal(order) === 0 ? 0 : null;
  if (
    order.items.some(
      (item) => item.unit_cost === null || item.unit_cost === undefined,
    )
  )
    return null;
  return order.items.reduce(
    (sum, item) => sum + Number(item.unit_cost) * item.quantity,
    0,
  );
}

export function buildStoreReport(orders: ReportOrder[], range: ReportRange) {
  const selected = orders.filter((order) => within(order.created_at, range));
  const active = selected.filter(
    (order) => order.status !== "cancelled" && order.status !== "returned",
  );
  const completed = active.filter(
    (order) => order.status === "completed" && order.payment_status === "paid",
  );
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
    returned: 0,
  };
  const daily = new Map<
    string,
    {
      date: string;
      order_count: number;
      order_value: number;
      gross_sales: number;
      discounts: number;
      cancelled_sales: number;
      net_sales: number;
      collected: number;
      refunded: number;
      cost: number;
      cost_complete: boolean;
    }
  >();
  function day(timestamp: string) {
    const date = storeDate(timestamp);
    if (!daily.has(date))
      daily.set(date, {
        date,
        order_count: 0,
        order_value: 0,
        gross_sales: 0,
        discounts: 0,
        cancelled_sales: 0,
        net_sales: 0,
        collected: 0,
        refunded: 0,
        cost: 0,
        cost_complete: true,
      });
    return daily.get(date)!;
  }
  const products = new Map<
    string,
    {
      id: string;
      name: string;
      quantity: number;
      line_value: number;
      net_value: number;
      cost: number;
      cost_complete: boolean;
      net_complete: boolean;
    }
  >();
  const payments = new Map<
    PaymentMethod,
    {
      method: PaymentMethod;
      order_count: number;
      collected: number;
      refunded: number;
      awaiting: number;
    }
  >();
  function payment(order: ReportOrder) {
    const method = order.payment_method ?? "unconfigured";
    if (!payments.has(method))
      payments.set(method, {
        method,
        order_count: 0,
        collected: 0,
        refunded: 0,
        awaiting: 0,
      });
    return payments.get(method)!;
  }
  let grossSales = 0;
  let discounts = 0;
  let cancelledSales = 0;
  let refundedSales = 0;
  let returnedSales = 0;
  let knownCost = 0;
  let costOrders = 0;
  let missingCostOrders = 0;
  let damagedReturnCost = 0;
  let missingReturnCost = false;
  let shippingCharged = 0;
  for (const order of selected) {
    statusCounts[order.status]++;
    const row = day(order.created_at);
    row.order_count++;
    row.gross_sales += subtotal(order);
    grossSales += subtotal(order);
    const method = payment(order);
    method.order_count++;
    const carriesCost =
      order.status !== "cancelled" &&
      (order.status !== "returned" || order.return_restocked === false);
    if (carriesCost) {
      costOrders++;
      const cost = snapshotCost(order);
      if (cost === null) {
        missingCostOrders++;
        row.cost_complete = false;
      } else {
        knownCost += cost;
        row.cost += cost;
      }
      if (order.status === "returned") {
        if (cost === null) missingReturnCost = true;
        else damagedReturnCost += cost;
      }
    }
    if (order.status === "returned") {
      returnedSales += subtotal(order);
      row.cancelled_sales += subtotal(order);
      continue;
    }
    if (order.status === "cancelled") {
      cancelledSales += subtotal(order);
      row.cancelled_sales += subtotal(order);
      continue;
    }
    const reduction = Number(order.discount_amount ?? 0);
    discounts += reduction;
    row.discounts += reduction;
    if (order.payment_status === "refunded")
      refundedSales += merchandiseNet(order);
    else row.net_sales += merchandiseNet(order);
    row.order_value += Number(order.total);
    if (order.payment_status === "awaiting_payment")
      method.awaiting += Number(order.total);
    if (order.payment_status === "refunded") continue;
    shippingCharged += Number(order.shipping_fee ?? 0);
    const lines = order.items ?? [];
    for (const item of lines) {
      const product = products.get(item.product_id) ?? {
        id: item.product_id,
        name: item.name,
        quantity: 0,
        line_value: 0,
        net_value: 0,
        cost: 0,
        cost_complete: true,
        net_complete: true,
      };
      product.quantity += item.quantity;
      const lineValue = Number(item.price) * item.quantity;
      const allocatedDiscount =
        item.line_discount ?? (reduction === 0 ? 0 : null);
      if (allocatedDiscount === null) product.net_complete = false;
      product.line_value += lineValue;
      product.net_value += lineValue - (allocatedDiscount ?? 0);
      if (item.unit_cost === null || item.unit_cost === undefined)
        product.cost_complete = false;
      else product.cost += Number(item.unit_cost) * item.quantity;
      products.set(item.product_id, product);
    }
  }
  // Cash follows payment/refund dates, independently of the order creation period.
  let collected = 0;
  let refunded = 0;
  for (const order of orders) {
    if (
      order.payment_status !== "awaiting_payment" &&
      within(order.paid_at, range)
    ) {
      collected += Number(order.total);
      day(order.paid_at!).collected += Number(order.total);
      payment(order).collected += Number(order.total);
    }
    if (
      order.payment_status === "refunded" &&
      within(order.refunded_at, range)
    ) {
      refunded += Number(order.total);
      day(order.refunded_at!).refunded += Number(order.total);
      payment(order).refunded += Number(order.total);
    }
  }
  return {
    order_count: selected.length,
    active_order_count: active.length,
    cancelled_order_count: statusCounts.cancelled,
    completed_order_count: statusCounts.completed,
    successful_order_count: completed.length,
    returned_order_count: statusCounts.returned,
    order_value: orderValue,
    average_order_value: active.length ? orderValue / active.length : 0,
    completed_average_order_value: completed.length
      ? completed.reduce((sum, order) => sum + merchandiseNet(order), 0) /
        completed.length
      : 0,
    gross_sales: grossSales,
    discounts,
    cancelled_sales: cancelledSales,
    refunded_sales: refundedSales,
    returned_sales: returnedSales,
    net_sales:
      grossSales - cancelledSales - returnedSales - discounts - refundedSales,
    awaiting_payment_value: active
      .filter((order) => order.payment_status === "awaiting_payment")
      .reduce((sum, order) => sum + Number(order.total), 0),
    collected,
    refunded,
    net_collected: collected - refunded,
    shipping_charged: shippingCharged,
    cost_order_count: costOrders,
    missing_cost_order_count: missingCostOrders,
    known_cost: knownCost,
    cogs: missingCostOrders ? null : knownCost,
    damaged_return_cost: missingReturnCost ? null : damagedReturnCost,
    gross_profit: missingCostOrders
      ? null
      : grossSales -
        cancelledSales -
        returnedSales -
        discounts -
        refundedSales -
        knownCost,
    payment_breakdown: [...payments.values()],
    status_counts: statusCounts,
    daily: [...daily.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({
        ...row,
        cogs: row.cost_complete ? row.cost : null,
        gross_profit: row.cost_complete ? row.net_sales - row.cost : null,
      })),
    products: [...products.values()]
      .sort(
        (a, b) =>
          b.quantity - a.quantity ||
          b.line_value - a.line_value ||
          a.id.localeCompare(b.id),
      )
      .map((product) => ({
        ...product,
        net_value: product.net_complete ? product.net_value : null,
        gross_profit:
          product.cost_complete && product.net_complete
            ? product.net_value - product.cost
            : null,
      })),
  };
}
export type StoreReport = ReturnType<typeof buildStoreReport>;

/** Quote delimiters and neutralize spreadsheet formula prefixes. */
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
    ["Chỉ số", "Giá trị (VND nếu là tiền)"],
    ["Số đơn", report.order_count],
    ["GMV trước giảm giá và hủy/hoàn", report.gross_sales],
    ["Giảm giá (đơn chưa hủy)", report.discounts],
    ["Giá trị sản phẩm đã hủy", report.cancelled_sales],
    ["Giá trị sản phẩm trả hàng (trước giảm giá)", report.returned_sales],
    ["Giá trị sản phẩm đã hoàn tiền khác", report.refunded_sales],
    ["Doanh thu sản phẩm thuần", report.net_sales],
    [
      "AOV đơn hoàn tất đã thanh toán (không gồm vận chuyển)",
      report.completed_average_order_value,
    ],
    ["Tiền đã xác nhận trong kỳ", report.collected],
    ["Tiền hoàn trong kỳ", report.refunded],
    ["Thu ròng trong kỳ", report.net_collected],
    ["Chờ thanh toán", report.awaiting_payment_value],
    ["Phí giao hàng thu trên đơn còn hiệu lực", report.shipping_charged],
    [
      "Giá vốn theo thời điểm đặt (gồm hàng hoàn không nhập kho)",
      report.cogs ?? "Chưa đủ giá vốn",
    ],
    [
      "Chi phí hàng hoàn không nhập kho",
      report.damaged_return_cost ?? "Chưa đủ giá vốn",
    ],
    ["Lợi nhuận gộp dự kiến", report.gross_profit ?? "Chưa đủ giá vốn"],
    ["Đơn còn thiếu giá vốn", report.missing_cost_order_count],
    [],
    [
      "Ngày (Việt Nam)",
      "Số đơn",
      "GMV",
      "Giảm giá",
      "Giá trị hủy",
      "Doanh thu sản phẩm thuần",
      "Giá trị đơn chưa hủy",
      "Tiền xác nhận",
      "Tiền hoàn",
      "Thu ròng",
      "Giá vốn",
      "Lợi nhuận gộp dự kiến",
    ],
    ...report.daily.map((row) => [
      row.date,
      row.order_count,
      row.gross_sales,
      row.discounts,
      row.cancelled_sales,
      row.net_sales,
      row.order_value,
      row.collected,
      row.refunded,
      row.collected - row.refunded,
      row.cogs ?? "Chưa đủ giá vốn",
      row.gross_profit ?? "Chưa đủ giá vốn",
    ]),
    [],
    [
      "Phương thức thanh toán",
      "Số đơn",
      "Tiền xác nhận",
      "Tiền hoàn",
      "Chờ thanh toán",
    ],
    ...report.payment_breakdown.map((row) => [
      row.method,
      row.order_count,
      row.collected,
      row.refunded,
      row.awaiting,
    ]),
    [],
    [
      "Sản phẩm",
      "Số lượng (chưa hủy/hoàn)",
      "Giá trị trước giảm giá",
      "Doanh thu sau phân bổ ưu đãi",
      "Lợi nhuận gộp dự kiến",
    ],
    ...report.products.map((row) => [
      row.name,
      row.quantity,
      row.line_value,
      row.net_value ?? "Thiếu phân bổ ưu đãi",
      row.gross_profit ?? "Chưa đủ giá vốn",
    ]),
  ];
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
