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
  createVoucherMailer,
  voucherDeliveryFailure,
  voucherEmailConfigured,
} from "@/lib/email-server";
import {
  personalizeVoucherEmail,
  voucherEmailFooter,
  voucherEmailSchema,
  type VoucherEmailDelivery,
} from "@/lib/voucher-email";
import type { Discount } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;
type Context = { params: Promise<{ id: string }> };
const deliveryColumns =
  "id,recipient_user_id,recipient_email,recipient_name,status,error_message,sent_at";

function emailDatabaseError(error: { message: string; code?: string }) {
  const messages: Record<string, [number, string]> = {
    EMAIL_ADMIN_REQUIRED: [403, "Tài khoản không có quyền quản trị."],
    EMAIL_PRIVATE_REQUIRED: [400, "Chỉ gửi email cho voucher riêng tư."],
    EMAIL_IDEMPOTENCY_CONFLICT: [
      409,
      "Lần gửi này đã được tạo với nội dung khác. Đóng phần email và mở lại để soạn lần gửi mới.",
    ],
    EMAIL_RECIPIENT_NOT_ELIGIBLE: [
      400,
      "Một khách được chọn không thuộc đối tượng của voucher. Tải lại danh sách trước khi gửi.",
    ],
    EMAIL_RECIPIENT_UNVERIFIED: [
      400,
      "Một tài khoản chưa xác minh email hoặc không có địa chỉ hợp lệ. Chọn lại khách hàng trước khi gửi.",
    ],
    EMAIL_RECIPIENT_CHANGED: [
      400,
      "Email đăng nhập của khách đã thay đổi. Đóng phần email và mở lại để kiểm tra thông tin trước khi soạn lần gửi mới.",
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
      .from("voucher_email_campaigns")
      .select(
        `id,subject,created_at,deliveries:voucher_email_deliveries(${deliveryColumns})`,
      )
      .eq("discount_id", id)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw databaseError(error);
    return json({
      configured: voucherEmailConfigured(),
      campaigns: data ?? [],
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  let mailer: ReturnType<typeof createVoucherMailer> | undefined;
  try {
    assertSameOrigin(request);
    const { user } = await requireAdmin();
    const id = z.uuid().parse((await params).id);
    const input = voucherEmailSchema.parse(await readJson(request, 50_000));
    // Validate configuration before creating any delivery records.
    mailer = createVoucherMailer();
    const service = createServiceSupabase();
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          discount_id: id,
          subject: input.subject,
          body: input.body,
          recipients: [...input.recipient_user_ids].sort(),
        }),
      )
      .digest("hex");
    const { error: prepareError } = await service.rpc("prepare_voucher_email", {
      p_id: input.idempotency_key,
      p_discount_id: id,
      p_admin_id: user.id,
      p_payload_hash: hash,
      p_subject: input.subject,
      p_body: input.body,
      p_recipient_user_ids: input.recipient_user_ids,
    });
    if (prepareError) throw emailDatabaseError(prepareError);
    const { data: discount, error: discountError } = await service
      .from("discounts")
      .select("*")
      .eq("id", id)
      .single();
    if (discountError) throw databaseError(discountError);
    const { data, error } = await service
      .from("voucher_email_deliveries")
      .select(deliveryColumns)
      .eq("campaign_id", input.idempotency_key);
    if (error) throw databaseError(error);
    const deliveries = (data ?? []) as VoucherEmailDelivery[];
    const website = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url)
      .origin;
    const footer = voucherEmailFooter(discount as Discount, website);
    // Five workers bound SMTP parallelism. A conditional database claim keeps
    // duplicate HTTP requests from sending the same recipient twice.
    let index = 0;
    const activeMailer = mailer;
    const workers = await Promise.allSettled(
      Array.from({ length: Math.min(5, deliveries.length) }, async () => {
        while (index < deliveries.length) {
          const delivery = deliveries[index++];
          if (delivery.status !== "pending") continue;
          const { data: claimed, error: claimError } = await service
            .from("voucher_email_deliveries")
            .update({
              status: "sending",
              attempted_at: new Date().toISOString(),
            })
            .eq("id", delivery.id)
            .eq("status", "pending")
            .select("id")
            .maybeSingle();
          if (claimError) throw databaseError(claimError);
          if (!claimed) continue;
          let result: Record<string, unknown>;
          try {
            await activeMailer.send({
              to: delivery.recipient_email,
              subject: personalizeVoucherEmail(input.subject, delivery).replace(
                /[\r\n\u0000]/g,
                " ",
              ),
              text: `${personalizeVoucherEmail(input.body, delivery)}\n\n${footer}`,
              deliveryId: delivery.id,
            });
            result = {
              status: "sent",
              error_message: "",
              sent_at: new Date().toISOString(),
            };
          } catch (error) {
            const failure = voucherDeliveryFailure(error);
            result = { status: failure.status, error_message: failure.message };
          }
          const { error: resultError } = await service
            .from("voucher_email_deliveries")
            .update(result)
            .eq("id", delivery.id)
            .eq("status", "sending");
          if (resultError) throw databaseError(resultError);
        }
      }),
    );
    for (const worker of workers)
      if (worker.status === "rejected") throw worker.reason;
    const { data: results, error: resultsError } = await service
      .from("voucher_email_deliveries")
      .select(deliveryColumns)
      .eq("campaign_id", input.idempotency_key);
    if (resultsError) throw databaseError(resultsError);
    return json({
      campaign_id: input.idempotency_key,
      deliveries: results ?? [],
    });
  } catch (error) {
    return apiError(error);
  } finally {
    mailer?.close();
  }
}
