import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import { manualPaymentSchema } from "@/lib/validation";

type PaymentContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: PaymentContext) {
  try {
    assertSameOrigin(request);
    const { supabase } = await requireAdmin();
    const { id } = await params;
    z.uuid().parse(id);
    const input = manualPaymentSchema.parse(await readJson(request, 2_000));
    const { data, error } = await supabase.rpc("record_order_payment", {
      p_order_id: id,
      p_action: input.action,
      p_note: input.note,
    });
    if (error) throw databaseError(error);
    return json({ data });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(_request: Request, { params }: PaymentContext) {
  try {
    const { supabase } = await requireAdmin();
    const { id } = await params;
    z.uuid().parse(id);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (orderError) throw databaseError(orderError);
    if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng.");
    const { data, error } = await supabase
      .from("order_payment_events")
      .select("id,event,amount,note,created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true });
    if (error) throw databaseError(error);
    return json({ data });
  } catch (error) {
    return apiError(error);
  }
}
