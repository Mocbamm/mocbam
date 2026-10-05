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
  return allRows<ReportOrder>(
    supabase,
    "orders",
    "id,created_at,status,total,payment_status,paid_at,refunded_at,items:order_items(id,product_id,name,price,quantity)",
  );
}
