import { createClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/http";
import { publicConfig } from "./config";

export function createServiceSupabase() {
  const config = publicConfig();
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key)
    throw new HttpError(
      503,
      "Chức năng này chưa được cấu hình kết nối máy chủ.",
    );
  return createClient(config.url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
