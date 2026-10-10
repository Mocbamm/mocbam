import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  json,
  readJson,
  HttpError,
} from "@/lib/http";
import { getAdminSettings, settingsColumns } from "@/lib/catalog";
import { settingsSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase } = await requireAdmin();
    const input = settingsSchema.parse(await readJson(request));
    if (input.shipping_distance_enabled && !process.env.GOOGLE_MAPS_API_KEY)
      throw new HttpError(
        409,
        "Cần cấu hình Google Routes trên máy chủ trước khi bật phí theo km.",
      );
    const { data, error } = await supabase
      .from("site_settings")
      .update(input)
      .eq("id", true)
      .select(settingsColumns)
      .single();
    if (error) throw databaseError(error);
    return json({ data });
  } catch (error) {
    return apiError(error);
  }
}
export async function GET() {
  try {
    return json({ data: await getAdminSettings() });
  } catch (error) {
    return apiError(error);
  }
}
