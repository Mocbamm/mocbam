import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { orderColumns } from "@/lib/catalog";
import { apiError, databaseError, HttpError, json } from "@/lib/http";
import { createServiceSupabase } from "@/lib/supabase/admin";
import { matchesReceipt } from "@/lib/supabase/receipts";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = z.uuid().parse((await params).id);
    const db = createServiceSupabase();
    const { data, error } = await db
      .from("orders")
      .select(`${orderColumns},guest_access_hash`)
      .eq("id", id)
      .maybeSingle();
    if (error) throw databaseError(error);
    if (!data) throw new HttpError(404, "Không tìm thấy đơn hàng.");
    const user = await getCurrentUser();
    const token = new URL(request.url).searchParams.get("token");
    if (
      !(user && data.user_id === user.id) &&
      !matchesReceipt(token, data.guest_access_hash)
    )
      throw new HttpError(404, "Không tìm thấy đơn hàng.");
    const { guest_access_hash: _secret, ...order } = data;
    void _secret;
    return json({ order });
  } catch (error) {
    return apiError(error);
  }
}
