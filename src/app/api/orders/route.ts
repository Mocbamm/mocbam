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
import { orderAnalyticsSchema } from "@/lib/order-analytics";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = createServiceSupabase();
    const submitted = z
      .record(z.string(), z.unknown())
      .parse(await readJson(request, 16_000));
    const { analytics, ...orderSubmitted } = submitted;
    const input = orderSchema.parse(orderSubmitted);
    const attribution =
      analytics == null ? null : orderAnalyticsSchema.parse(analytics);
    input.customer.email = input.customer.email.toLowerCase();
    const user = await getCurrentUser();
    const token = receiptToken(input.idempotency_key);
    let includePaymentMethod = true;
    // Old checkout clients omitted the method. Keep their existing order hash
    // stable without changing the legacy order's saved payment instructions.
    if (!Object.prototype.hasOwnProperty.call(submitted, "payment_method")) {
      const { data: existing, error: readError } = await db
        .from("orders")
        .select("payment_method")
        .eq("idempotency_key", input.idempotency_key)
        .maybeSingle();
      if (readError) throw databaseError(readError);
      includePaymentMethod = existing?.payment_method !== "unconfigured";
    }
    const { data, error } = await db.rpc(
      attribution ? "create_order_with_analytics" : "create_order",
      {
        p_items: input.items,
        p_customer: {
          ...input.customer,
          ...(input.shipping_quote_id
            ? { shipping_quote_id: input.shipping_quote_id }
            : {}),
        },
        p_idempotency_key: input.idempotency_key,
        p_payload_hash: digest(
          canonicalOrderPayload(input, user?.id || null, includePaymentMethod),
        ),
        p_receipt_hash: digest(token),
        p_user_id: user?.id || null,
        p_payment_method: input.payment_method,
        p_discount_code: input.discount_code,
        ...(attribution ? { p_analytics: attribution } : {}),
      },
    );
    if (error) throw databaseError(error);
    return json({ id: data.id, reference: data.reference, token }, 201);
  } catch (error) {
    return apiError(error);
  }
}
