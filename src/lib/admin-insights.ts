import { requireAdmin } from "./auth";
import { databaseError } from "./http";
import {
  consolidateCustomers,
  type CustomerContact,
  type CustomerOrder,
  type CustomerProfile,
} from "./customer-insights";
import type { ReportOrder } from "./store-reports";

type AdminDatabase = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

// Fetch every page; Supabase's default row cap must not silently undercount reports.
async function allRows<T>(
  supabase: AdminDatabase,
  table: string,
  columns: string,
): Promise<T[]> {
  const pageSize = 500;
  const rows: T[] = [];
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(start, start + pageSize - 1);
    if (error) throw databaseError(error);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) return rows;
  }
}

export async function getAdminCustomers() {
  const { supabase } = await requireAdmin();
  const [profiles, orders, inquiries] = await Promise.all([
    allRows<CustomerProfile>(
      supabase,
      "profiles",
      "id,full_name,email,phone,created_at,updated_at",
    ),
    allRows<CustomerOrder>(
      supabase,
      "orders",
      "id,reference,user_id,customer_name,email,phone,total,status,created_at",
    ),
    allRows<CustomerContact>(
      supabase,
      "inquiries",
      "id,name,email,phone,created_at",
    ),
  ]);
  return consolidateCustomers(profiles, orders, inquiries);
}

export async function getAdminReportOrders() {
  const { supabase } = await requireAdmin();
  const orders = await allRows<ReportOrder>(
    supabase,
    "orders",
    "id,created_at,status,subtotal,shipping_fee,discount_amount,total,payment_method,payment_status,paid_at,refunded_at,return_restocked,returned_at,items:order_items(id,product_id,name,price,quantity,line_discount)",
  );
  const costs = new Map<string, number | null>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.rpc("get_admin_order_item_costs", {
      p_offset: offset,
      p_limit: 500,
    });
    if (error) throw databaseError(error);
    const rows = (data || []) as { id: string; unit_cost: number | null }[];
    rows.forEach((row) => costs.set(row.id, row.unit_cost));
    if (rows.length < 500) break;
  }
  return orders.map((order) => ({
    ...order,
    items: order.items?.map((item) => ({
      ...item,
      unit_cost: costs.get(item.id) ?? null,
    })),
  }));
}
