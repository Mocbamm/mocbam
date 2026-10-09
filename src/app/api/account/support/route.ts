import { getCurrentUser } from "@/lib/auth";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import { supportMessageSchema } from "@/lib/support";
import { createServerSupabase } from "@/lib/supabase/server";

async function session() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Đăng nhập để trò chuyện với Mộc.");
  return { user, db: await createServerSupabase() };
}
export async function GET() {
  try {
    const { user, db } = await session();
    const { data, error } = await db
      .from("support_messages")
      .select("id,user_id,sender,body,created_at")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .limit(200);
    if (error) throw databaseError(error);
    return json({ messages: (data || []).reverse() });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { db } = await session();
    const { body } = supportMessageSchema.parse(await readJson(request, 16000));
    const { data, error } = await db.rpc("send_support_message", {
      p_body: body,
    });
    if (error) throw databaseError(error);
    return json({ message: data }, 201);
  } catch (error) {
    return apiError(error);
  }
}
