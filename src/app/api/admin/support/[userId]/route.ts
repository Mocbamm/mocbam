import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  json,
  readJson,
} from "@/lib/http";
import { supportMessageSchema } from "@/lib/support";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { supabase } = await requireAdmin();
    const userId = z.uuid().parse((await params).userId);
    const { body } = supportMessageSchema.parse(await readJson(request, 16000));
    const { data, error } = await supabase.rpc("send_support_message", {
      p_body: body,
      p_user_id: userId,
    });
    if (error) throw databaseError(error);
    return json({ message: data }, 201);
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { supabase } = await requireAdmin();
    const userId = z.uuid().parse((await params).userId);
    const input = z
      .object({ resolved: z.boolean() })
      .strict()
      .parse(await readJson(request));
    const { error } = await supabase
      .from("support_threads")
      .update(input)
      .eq("user_id", userId);
    if (error) throw databaseError(error);
    return json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
