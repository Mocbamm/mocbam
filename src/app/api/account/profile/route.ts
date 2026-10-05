import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "Vui lòng đăng nhập.");
    const input = z
      .object({
        full_name: z.string().trim().min(2).max(100),
        phone: z
          .string()
          .trim()
          .regex(/^[+0-9().\s-]{7,30}$/),
      })
      .parse(await readJson(request, 2000));
    const db = await createServerSupabase();
    const { data, error } = await db
      .from("profiles")
      .update(input)
      .eq("id", user.id)
      .select("full_name,phone")
      .single();
    if (error) throw databaseError(error);
    return json({ profile: data });
  } catch (error) {
    return apiError(error);
  }
}
