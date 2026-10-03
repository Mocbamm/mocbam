import type { User } from "@supabase/supabase-js";
import { HttpError, databaseError } from "./http";
import { isConfigured } from "./supabase/config";
import { createServerSupabase } from "./supabase/server";

export async function getCurrentUser(): Promise<User | null> {
  if (!isConfigured()) return null;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (
    error &&
    error.name !== "AuthSessionMissingError" &&
    error.status &&
    error.status >= 500
  )
    throw new HttpError(503, "Dịch vụ đăng nhập tạm thời không khả dụng.");
  return error ? null : data.user;
}

export async function isAdmin(user?: User | null): Promise<boolean> {
  if (!isConfigured()) return false;
  const current = user === undefined ? await getCurrentUser() : user;
  if (!current) return false;
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("admin_members")
    .select("user_id")
    .eq("user_id", current.id)
    .maybeSingle();
  if (error) throw databaseError(error);
  return Boolean(data);
}

export async function requireAdmin() {
  if (!isConfigured())
    throw new HttpError(503, "Kết nối Supabase để sử dụng trang quản trị.");
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Vui lòng đăng nhập.");
  if (!(await isAdmin(user)))
    throw new HttpError(403, "Tài khoản không có quyền quản trị.");
  return { user, supabase: await createServerSupabase() };
}
