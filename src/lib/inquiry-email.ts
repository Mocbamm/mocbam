import { z } from "zod";

export const inquiryEmailSchema = z
  .object({
    idempotency_key: z.uuid(),
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
  .strict();

export type InquiryEmailReply = {
  id: string;
  inquiry_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: "pending" | "sending" | "sent" | "failed" | "unknown";
  error_message: string;
  created_at: string;
  sent_at: string | null;
};

export const inquiryEmailStatusLabels = {
  pending: "Chờ gửi",
  sending: "Đang gửi / chờ xác minh",
  sent: "Máy chủ email đã tiếp nhận",
  failed: "Gửi thất bại",
  unknown: "Chưa xác minh được kết quả",
} satisfies Record<InquiryEmailReply["status"], string>;
