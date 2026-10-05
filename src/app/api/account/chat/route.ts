import { getCurrentUser } from "@/lib/auth";
import { chatHistorySchema } from "@/lib/chat-history";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";

async function session() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Vui lòng đăng nhập.");
  return { user, db: await createServerSupabase() };
}

export async function GET() {
  try {
    const { user, db } = await session();
    const { data, error } = await db
      .from("chat_conversations")
      .select("messages")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw databaseError(error);
    return json({ messages: data?.messages || [] });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const { user, db } = await session();
    const input = chatHistorySchema.parse(await readJson(request, 80_000));
    const { error } = await db
      .from("chat_conversations")
      .upsert({
        user_id: user.id,
        messages: input.messages,
        updated_at: new Date().toISOString(),
      });
    if (error) throw databaseError(error);
    return json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
