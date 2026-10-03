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
  "id,slug,name,category_id,price,stock,image_url,description,featured,active,created_at";
const postColumns =
  "id,slug,title,excerpt,content,image_url,published,created_at";
export const orderColumns =
  "id,reference,user_id,customer_name,email,phone,address,city,note,subtotal,shipping_fee,total,status,payment_status,created_at,items:order_items(id,product_id,name,price,quantity)";
export const settingsColumns =
  "shipping_fee,shop_email,shop_phone,shop_address,shop_hours,facebook_url,instagram_url,tiktok_url";

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
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .order(sort, { ascending: false });
  if (error) throw databaseError(error);
  return data as T[];
}
export const getAdminProducts = () =>
  adminRows<Product>("products", productColumns);
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
  const [products, orders, inquiries] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("status,total"),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false),
  ]);
  for (const result of [products, orders, inquiries])
    if (result.error) throw databaseError(result.error);
  return {
    product_count: products.count || 0,
    order_count: orders.data?.length || 0,
    pending_orders:
      orders.data?.filter((order) => order.status === "pending").length || 0,
    inquiry_count: inquiries.count || 0,
    total_order_value:
      orders.data
        ?.filter((order) => order.status !== "cancelled")
        .reduce((sum, order) => sum + Number(order.total), 0) || 0,
  };
}
