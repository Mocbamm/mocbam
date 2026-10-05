import { getCurrentUser } from "./auth";
import { createServerSupabase } from "./supabase/server";
import { databaseError } from "./http";

export async function getCustomerProfile() {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await createServerSupabase();
  const { data, error } = await db
    .from("profiles")
    .select("id,full_name,email,phone")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw databaseError(error);
  return data as {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  } | null;
}
