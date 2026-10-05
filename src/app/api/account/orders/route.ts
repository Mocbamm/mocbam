import { getCurrentUser } from "@/lib/auth";
import { orderColumns } from "@/lib/catalog";
import { apiError, databaseError, HttpError, json } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Vui lòng đăng nhập để xem đơn hàng.");
    // Only a verified email owner can recover guest orders addressed to that email.
    // Never infer ownership from editable profile metadata or a submitted email.
    if (user.email && user.email_confirmed_at) {
      const service = createServiceSupabase();
      const { error } = await service.rpc("claim_guest_orders", {
        p_user_id: user.id,
      });
      if (error) throw databaseError(error);
    }
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
