import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  apiError,
  assertSameOrigin,
  HttpError,
  json,
  readJson,
  requestOrigin,
  safeNext,
} from "@/lib/http";

const credentials = z.object({
  mode: z.enum(["login", "register"]),
  email: z
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().trim().max(100).default(""),
  phone: z.string().trim().max(30).default(""),
  next: z.string().max(500).optional(),
});
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = credentials.parse(await readJson(request, 4000));
    const db = await createServerSupabase();
    if (input.mode === "register") {
      if (input.name.length < 2 || !/^[+0-9().\s-]{7,30}$/.test(input.phone))
        throw new HttpError(
          400,
          "Vui lòng nhập họ tên và số điện thoại hợp lệ.",
        );
      const { data, error } = await db.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.name, phone: input.phone },
          emailRedirectTo: `${requestOrigin(request)}/auth/callback`,
        },
      });
      if (error)
        throw new HttpError(
          error.status === 429 ? 429 : 400,
          error.status === 429
            ? "Vui lòng đợi một chút rồi thử lại."
            : "Chưa thể đăng ký. Vui lòng kiểm tra thông tin hoặc thử đăng nhập.",
        );
      return json({
        ok: true,
        confirmation: !data.session,
        next: safeNext(input.next || null),
      });
    }
    const { error } = await db.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error)
      throw new HttpError(
        error.status === 429 ? 429 : 400,
        "Email hoặc mật khẩu chưa đúng, hoặc email chưa được xác nhận.",
      );
    return json({ ok: true, next: safeNext(input.next || null) });
  } catch (error) {
    return apiError(error);
  }
}
