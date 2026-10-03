import {
  apiError,
  assertSameOrigin,
  databaseError,
  json,
  readJson,
} from "@/lib/http";
import { createServiceSupabase } from "@/lib/supabase/admin";
import { inquirySchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const db = createServiceSupabase();
    const input = inquirySchema.parse(await readJson(request, 20_000));
    const { data, error } = await db.rpc("submit_inquiry", {
      p_name: input.name,
      p_email: input.email.toLowerCase(),
      p_phone: input.phone,
      p_message: input.message,
    });
    if (error) throw databaseError(error);
    return json({ ok: true, id: data }, 201);
  } catch (error) {
    return apiError(error);
  }
}
