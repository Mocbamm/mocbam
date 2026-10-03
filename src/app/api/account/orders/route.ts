import { getCurrentUser } from "@/lib/auth";
import { orderColumns } from "@/lib/catalog";
import { apiError, databaseError, HttpError, json } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Vui lòng đăng nhập để xem đơn hàng.");
    const db = await createServerSupabase();
    const { data, error } = await db
      .from("orders")
      .select(orderColumns)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw databaseError(error);
    return json({ orders: data });
  } catch (error) {
    return apiError(error);
  }
}
