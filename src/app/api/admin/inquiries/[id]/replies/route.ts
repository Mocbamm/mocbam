import { createHash } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServiceSupabase } from "@/lib/supabase/admin";
import {
  apiError,
  assertSameOrigin,
  databaseError,
  HttpError,
  json,
  readJson,
} from "@/lib/http";
import {
  createInquiryMailer,
  storeDeliveryFailure,
  storeEmailConfigured,
} from "@/lib/email-server";
import {
  inquiryEmailSchema,
  type InquiryEmailReply,
} from "@/lib/inquiry-email";

export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
const replyColumns =
  "id,inquiry_id,recipient_email,subject,body,status,error_message,created_at,sent_at";

function emailError(error: { message: string; code?: string }) {
  const messages: Record<string, [number, string]> = {
    EMAIL_ADMIN_REQUIRED: [403, "Tài khoản không có quyền quản trị."],
    EMAIL_IDEMPOTENCY_CONFLICT: [
      409,
      "Lần phản hồi này đã được tạo với nội dung khác. Đóng phần soạn và mở lại để tạo phản hồi mới.",
    ],
    EMAIL_INQUIRY_NOT_FOUND: [404, "Không tìm thấy lời nhắn của khách hàng."],
    EMAIL_INQUIRY_ADDRESS_INVALID: [
      400,
      "Lời nhắn không có địa chỉ email hợp lệ. Hãy liên hệ khách qua số điện thoại nếu có.",
    ],
  };
  for (const [code, [status, message]] of Object.entries(messages))
    if (error.message.includes(code)) return new HttpError(status, message);
  return databaseError(error);
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { supabase } = await requireAdmin();
    const id = z.uuid().parse((await params).id);
    const { data, error } = await supabase
      .from("inquiry_email_replies")
      .select(replyColumns)
      .eq("inquiry_id", id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw databaseError(error);
    return json({ configured: storeEmailConfigured(), replies: data ?? [] });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  let mailer: ReturnType<typeof createInquiryMailer> | undefined;
  try {
    assertSameOrigin(request);
    const { user } = await requireAdmin();
    const id = z.uuid().parse((await params).id);
    const input = inquiryEmailSchema.parse(await readJson(request, 50_000));
    mailer = createInquiryMailer();
    const service = createServiceSupabase();
    const payloadHash = createHash("sha256")
      .update(
        JSON.stringify({
          inquiry_id: id,
          subject: input.subject,
          body: input.body,
        }),
      )
      .digest("hex");
    const { error: prepareError } = await service.rpc("prepare_inquiry_email", {
      p_id: input.idempotency_key,
      p_inquiry_id: id,
      p_admin_id: user.id,
      p_payload_hash: payloadHash,
      p_subject: input.subject,
      p_body: input.body,
    });
    if (prepareError) throw emailError(prepareError);
    const { data: stored, error: storedError } = await service
      .from("inquiry_email_replies")
      .select(replyColumns)
      .eq("id", input.idempotency_key)
      .single();
    if (storedError) throw databaseError(storedError);
    const reply = stored as InquiryEmailReply;
    if (reply.status === "pending") {
      const { data: claimed, error: claimError } = await service
        .from("inquiry_email_replies")
        .update({ status: "sending", attempted_at: new Date().toISOString() })
        .eq("id", reply.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (claimError) throw databaseError(claimError);
      if (claimed) {
        let result: Record<string, unknown>;
        if (!z.email().safeParse(reply.recipient_email).success) {
          result = {
            status: "failed",
            error_message:
              "Địa chỉ email trong lời nhắn không hợp lệ. Hãy liên hệ khách qua số điện thoại nếu có.",
          };
        } else {
          try {
            await mailer.send({
              to: reply.recipient_email,
              subject: reply.subject,
              text: reply.body,
              deliveryId: reply.id,
            });
            result = {
              status: "sent",
              error_message: "",
              sent_at: new Date().toISOString(),
            };
          } catch (error) {
            const failure = storeDeliveryFailure(error);
            result = { status: failure.status, error_message: failure.message };
          }
        }
        const { error: updateError } = await service
          .from("inquiry_email_replies")
          .update(result)
          .eq("id", reply.id)
          .eq("status", "sending");
        if (updateError) throw databaseError(updateError);
      }
    }
    const { data, error } = await service
      .from("inquiry_email_replies")
      .select(replyColumns)
      .eq("id", reply.id)
      .single();
    if (error) throw databaseError(error);
    return json({ reply: data });
  } catch (error) {
    return apiError(error);
  } finally {
    mailer?.close();
  }
}
