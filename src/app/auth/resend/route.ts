import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  apiError,
  assertSameOrigin,
  HttpError,
  json,
  readJson,
  requestOrigin,
} from "@/lib/http";

const input = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { email } = input.parse(await readJson(request, 1000));
    const db = await createServerSupabase();
    const { error } = await db.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${requestOrigin(request)}/auth/callback` },
    });
    if (error?.status === 429)
      throw new HttpError(
        429,
        "Vui lòng đợi một phút trước khi gửi lại email.",
      );
    // Keep account-existence errors indistinguishable. Delivery failures remain actionable.
    if (
      error &&
      ((error.status ?? 0) >= 500 || error.code === "email_address_not_authorized")
    )
      throw new HttpError(
        503,
        "Chưa thể gửi email lúc này. Vui lòng thử lại sau hoặc đăng nhập bằng Google.",
      );
    return json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
