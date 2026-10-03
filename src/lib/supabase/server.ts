import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { HttpError } from "@/lib/http";
import { publicConfig } from "./config";

export async function createServerSupabase() {
  const config = publicConfig();
  if (!config)
    throw new HttpError(
      503,
      "Cửa hàng chưa kết nối cơ sở dữ liệu. Hiện chỉ có thể xem sản phẩm mẫu.",
    );
  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes the session.
        }
      },
    },
  });
}

export const createClient = createServerSupabase;
