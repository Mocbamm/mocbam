import { createHmac } from "node:crypto";
import { z } from "zod";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import { createServiceSupabase } from "@/lib/supabase/admin";
import { roadDistance } from "@/lib/shipping-server";
const schema = z
  .object({
    address: z.string().trim().min(1).max(500),
    city: z.string().trim().min(1).max(100),
    ward: z.string().trim().min(1).max(100),
  })
  .strict();
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await readJson(request, 3000));
    const db = createServiceSupabase();
    const { data: settings, error: settingsError } = await db
      .from("site_settings")
      .select("shipping_distance_enabled,shipping_origin_address")
      .eq("id", true)
      .single();
    if (settingsError) throw databaseError(settingsError);
    if (!settings.shipping_distance_enabled)
      throw new HttpError(409, "Cửa hàng đang áp dụng phí theo khu vực.");
    const secret = process.env.ORDER_TOKEN_SECRET;
    if (!secret)
      throw new HttpError(503, "Dịch vụ tính phí chưa được cấu hình.");
    const client =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const key = createHmac("sha256", secret)
      .update(`shipping:${client}`)
      .digest("hex");
    const { data: allowed, error: limitError } = await db.rpc(
      "reserve_shipping_request",
      { p_key: key },
    );
    if (limitError) throw databaseError(limitError);
    if (!allowed)
      throw new HttpError(
        429,
        "Bạn đã tính phí nhiều lần. Vui lòng đợi một phút rồi thử lại.",
      );
    const distance = await roadDistance(
      settings.shipping_origin_address,
      input,
    );
    const { data, error } = await db.rpc("create_shipping_quote", {
      p_customer: input,
      p_distance_meters: distance,
      p_origin_address: settings.shipping_origin_address,
    });
    if (error) throw databaseError(error);
    return json({ data });
  } catch (error) {
    return apiError(error);
  }
}
