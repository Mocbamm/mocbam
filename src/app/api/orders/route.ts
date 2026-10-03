import { getCurrentUser } from "@/lib/auth";
import {
  assertSameOrigin,
  apiError,
  databaseError,
  json,
  readJson,
} from "@/lib/http";
import { createServiceSupabase } from "@/lib/supabase/admin";
import { digest, receiptToken } from "@/lib/supabase/receipts";
import { canonicalOrderPayload, orderSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = createServiceSupabase();
    const input = orderSchema.parse(await readJson(request, 16_000));
    input.customer.email = input.customer.email.toLowerCase();
    const user = await getCurrentUser();
    const token = receiptToken(input.idempotency_key);
    const { data, error } = await db.rpc("create_order", {
      p_items: input.items,
      p_customer: input.customer,
      p_idempotency_key: input.idempotency_key,
      p_payload_hash: digest(canonicalOrderPayload(input, user?.id || null)),
      p_receipt_hash: digest(token),
      p_user_id: user?.id || null,
    });
    if (error) throw databaseError(error);
    return json({ id: data.id, reference: data.reference, token }, 201);
  } catch (error) {
    return apiError(error);
  }
}
