import type {
  BlogPost,
  Category,
  Inquiry,
  Order,
  Product,
  SiteContent,
  SiteSettings,
} from "./types";
import {
  demoCategories,
  demoContent,
  demoPosts,
  demoProducts,
  demoSettings,
} from "./demo-data";
import { requireAdmin } from "./auth";
import { databaseError } from "./http";
import { isConfigured } from "./supabase/config";
import { createServerSupabase } from "./supabase/server";

export { isConfigured };
const productColumns =
  "id,slug,name,category_id,price,stock,image_url,image_urls,video_url,variants,revision,description,featured,is_new,active,created_at";
const postColumns =
  "id,slug,title,excerpt,content,image_url,video_url,published,created_at";
export const orderColumns =
  "id,reference,user_id,customer_name,email,phone,address,city,note,subtotal,shipping_fee,total,discount_code,discount_amount,status,payment_method,payment_status,paid_at,refunded_at,return_restocked,returned_at,payment_bank_bin,payment_bank_name,payment_bank_account_number,payment_bank_account_name,created_at,items:order_items(id,product_id,variant_id,variant_name,name,price,quantity,line_discount)";
export const settingsColumns =
  "shipping_fee,shipping_zones,shop_email,shop_phone,shop_address,shop_hours,facebook_url,instagram_url,tiktok_url,zalo_url,shopee_url,bank_transfer_enabled,bank_bin,bank_name,bank_account_number,bank_account_name";

export async function getProducts(): Promise<Product[]> {
  if (!isConfigured())
    return structuredClone(demoProducts.filter((p) => p.active));
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("products")
    .select(productColumns)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .order("id");
  if (error) throw databaseError(error);
  return data as Product[];
}
export async function getProduct(slug: string): Promise<Product | null> {
  if (!isConfigured())
    return structuredClone(
      demoProducts.find((p) => p.slug === slug && p.active) || null,
    );
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("products")
    .select(productColumns)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw databaseError(error);
  return data as Product | null;
}
export async function getCategories(): Promise<Category[]> {
  if (!isConfigured()) return structuredClone(demoCategories);
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("categories")
    .select("id,slug,name,description")
    .order("name");
  if (error) throw databaseError(error);
  return data as Category[];
}
export async function getPosts(): Promise<BlogPost[]> {
  if (!isConfigured())
    return structuredClone(demoPosts.filter((p) => p.published));
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("posts")
    .select(postColumns)
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) throw databaseError(error);
  return data as BlogPost[];
}
export async function getPost(slug: string): Promise<BlogPost | null> {
  if (!isConfigured())
    return structuredClone(
      demoPosts.find((p) => p.slug === slug && p.published) || null,
    );
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("posts")
    .select(postColumns)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw databaseError(error);
  return data as BlogPost | null;
}
export async function getSiteContent(key: string): Promise<SiteContent | null> {
  if (!isConfigured())
    return structuredClone(demoContent.find((p) => p.key === key) || null);
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("site_content")
    .select("key,title,content")
    .eq("key", key)
    .maybeSingle();
  if (error) throw databaseError(error);
  return data as SiteContent | null;
}
export async function getSettings(): Promise<SiteSettings> {
  if (!isConfigured()) return structuredClone(demoSettings);
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("site_settings")
    .select(settingsColumns)
    .eq("id", true)
    .single();
  if (error) throw databaseError(error);
  return data as SiteSettings;
}

async function adminRows<T>(
  table: string,
  columns: string,
  sort = "created_at",
): Promise<T[]> {
  const { supabase } = await requireAdmin();
  const rows: T[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from(table)
      .select(columns)
      .order(sort, { ascending: false });
    if (sort !== "key") query = query.order("id", { ascending: false });
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw databaseError(error);
    rows.push(...((data || []) as T[]));
    if (!data || data.length < pageSize) return rows;
  }
}
export async function getAdminProducts(): Promise<Product[]> {
  const { supabase } = await requireAdmin();
  const rows: Product[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.rpc("get_admin_products", {
      p_offset: offset,
      p_limit: 500,
    });
    if (error) throw databaseError(error);
    rows.push(...((data || []) as Product[]));
    if (!data || data.length < 500) return rows;
  }
}
export const getAdminOrders = () => adminRows<Order>("orders", orderColumns);
export const getAdminPosts = () => adminRows<BlogPost>("posts", postColumns);
export const getAdminContent = () =>
  adminRows<SiteContent>("site_content", "key,title,content", "key");
export const getAdminInquiries = () =>
  adminRows<Inquiry>(
    "inquiries",
    "id,name,email,phone,message,resolved,created_at",
  );
export async function getAdminSettings() {
  await requireAdmin();
  return getSettings();
}
export async function getAdminDashboard() {
  const { supabase } = await requireAdmin();
  const [products, orders, inquiries, support] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    adminRows<Pick<Order, "status" | "total">>(
      "orders",
      "id,status,total",
    ).then((data) => ({ data, error: null })),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false),
    supabase
      .from("support_threads")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false),
  ]);
  for (const result of [products, orders, inquiries, support])
    if (result.error) throw databaseError(result.error);
  return {
    product_count: products.count || 0,
    order_count: orders.data?.length || 0,
    pending_orders:
      orders.data?.filter((order) => order.status === "pending").length || 0,
    inquiry_count: (inquiries.count || 0) + (support.count || 0),
    total_order_value:
      orders.data
        ?.filter((order) => !["cancelled", "returned"].includes(order.status))
        .reduce((sum, order) => sum + Number(order.total), 0) || 0,
  };
}
