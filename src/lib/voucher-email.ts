import { z } from "zod";
import type { Discount } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export const voucherEmailSchema = z
  .object({
    idempotency_key: z.uuid(),
    recipient_user_ids: z.array(z.uuid()).min(1).max(50),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[^\r\n\u0000]+$/),
    body: z
      .string()
      .trim()
      .min(1)
      .max(10_000)
      .regex(/^[^\u0000]+$/),
  })
  .strict()
  .refine(
    (input) =>
      new Set(input.recipient_user_ids).size ===
      input.recipient_user_ids.length,
    { message: "Khách hàng bị chọn trùng.", path: ["recipient_user_ids"] },
  );

export type VoucherEmailInput = z.infer<typeof voucherEmailSchema>;
export type VoucherEmailDelivery = {
  id: string;
  recipient_user_id: string | null;
  recipient_email: string;
  recipient_name: string;
  status: "pending" | "sending" | "sent" | "failed" | "unknown";
  error_message: string;
  sent_at: string | null;
};
export type VoucherEmailCampaign = {
  id: string;
  subject: string;
  created_at: string;
  deliveries: VoucherEmailDelivery[];
};

export const voucherEmailStatusLabels = {
  pending: "Chờ gửi",
  sending: "Đang gửi / chờ xác minh",
  sent: "Máy chủ email đã tiếp nhận",
  failed: "Gửi thất bại",
  unknown: "Chưa xác minh được kết quả",
} satisfies Record<VoucherEmailDelivery["status"], string>;

export function privateVoucherCustomerIds(discount: Discount) {
  return discount.customer_user_ids?.length
    ? discount.customer_user_ids
    : discount.customer_user_id
      ? [discount.customer_user_id]
      : [];
}

export function voucherEmailFooter(discount: Discount, website: string) {
  const date = (value: string | null) =>
    value
      ? new Date(value).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          dateStyle: "short",
          timeStyle: "short",
        })
      : "Không giới hạn";
  return [
    `Mã ưu đãi riêng: ${discount.code}`,
    `Mức giảm: ${discount.kind === "percentage" ? `${discount.value}%` : formatPrice(discount.value)}`,
    `Giá trị sản phẩm tối thiểu: ${formatPrice(discount.min_subtotal)}`,
    ...(discount.max_discount === null
      ? []
      : [`Giảm tối đa: ${formatPrice(discount.max_discount)}`]),
    `Bắt đầu: ${date(discount.starts_at)}`,
    `Kết thúc: ${date(discount.ends_at)}`,
    `Đăng nhập đúng tài khoản nhận email và nhập mã khi thanh toán tại ${website}.`,
    "Mã chỉ áp dụng cho tài khoản được Mộc Bàm chọn, trong thời gian và số lượt còn hiệu lực.",
  ].join("\n");
}

export function personalizeVoucherEmail(
  value: string,
  recipient: Pick<VoucherEmailDelivery, "recipient_name" | "recipient_email">,
) {
  return value
    .replaceAll("{ten_khach}", recipient.recipient_name || "bạn")
    .replaceAll("{email}", recipient.recipient_email);
}
