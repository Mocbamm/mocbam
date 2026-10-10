"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Inquiry } from "@/lib/types";
import {
  inquiryEmailStatusLabels,
  type InquiryEmailReply,
} from "@/lib/inquiry-email";
import { adminRequest, reportError } from "./admin-common";

export function InquiryReplyComposer({
  inquiry,
  onClose,
}: {
  inquiry: Inquiry;
  onClose: () => void;
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [subject, setSubject] = useState("Mộc Bàm phản hồi lời nhắn của bạn");
  const [body, setBody] = useState(
    `Chào ${inquiry.name || "bạn"},\n\nCảm ơn bạn đã nhắn cho Mộc.\n\n\nThân mến,\nMộc Bàm`,
  );
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [history, setHistory] = useState<InquiryEmailReply[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<InquiryEmailReply | null>(null);
  const [loadError, setLoadError] = useState("");
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          `/api/admin/inquiries/${inquiry.id}/replies`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Không thể tải lịch sử phản hồi.");
        if (controller.signal.aborted) return;
        setConfigured(Boolean(data.configured));
        setHistory(data.replies ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setConfigured(false);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Không thể tải lịch sử phản hồi.",
        );
      }
    }
    void load();
    return () => controller.abort();
  }, [inquiry.id]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setAttempted(true);
    try {
      const data = await adminRequest(
        `/api/admin/inquiries/${inquiry.id}/replies`,
        "POST",
        { idempotency_key: idempotencyKey, subject, body },
      );
      const reply = data.reply as InquiryEmailReply;
      setResult(reply);
      setHistory((previous) =>
        [reply, ...previous.filter((item) => item.id !== reply.id)].slice(
          0,
          10,
        ),
      );
      if (reply.status === "sent")
        toast.success("Máy chủ email đã tiếp nhận phản hồi.");
      else
        toast.error(
          reply.error_message || inquiryEmailStatusLabels[reply.status],
        );
    } catch (error) {
      reportError(error);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  const date = (value: string) =>
    new Date(value).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      dateStyle: "short",
      timeStyle: "short",
    });
  return (
    <section
      aria-label={`Phản hồi email cho ${inquiry.name}`}
      className="mt-5 space-y-4 rounded-xl border border-[#dfe5d8] bg-[#f8faf4] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium">Phản hồi trực tiếp qua email</h3>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Đóng phần phản hồi email"
          disabled={sending}
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>
      <p className="text-sm">
        Người nhận: <strong>{inquiry.email}</strong>
      </p>
      {configured === null ? (
        <p role="status" className="text-sm">
          Đang tải lịch sử và kiểm tra email...
        </p>
      ) : !configured ? (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          {loadError ||
            "Chưa kết nối dịch vụ gửi email cho website. Cần cấu hình SMTP trước khi gửi phản hồi."}
        </p>
      ) : null}
      <form onSubmit={send} className="space-y-4">
        <fieldset disabled={sending || attempted} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`inquiry-subject-${inquiry.id}`}>
              Tiêu đề email
            </Label>
            <Input
              id={`inquiry-subject-${inquiry.id}`}
              required
              maxLength={200}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`inquiry-body-${inquiry.id}`}>
              Nội dung phản hồi
            </Label>
            <Textarea
              id={`inquiry-body-${inquiry.id}`}
              rows={9}
              required
              maxLength={10_000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
        </fieldset>
        {attempted ? (
          <p className="text-xs leading-6 text-[#6b7867]">
            Nội dung đã được khóa để chống gửi trùng. Thử lại chỉ tiếp tục phản
            hồi chưa bắt đầu gửi. Email thất bại hoặc chưa rõ kết quả không tự
            gửi lại; kiểm tra lịch sử và hộp thư đã gửi trước khi đóng phần soạn
            để tạo phản hồi mới.
          </p>
        ) : (
          <p className="text-xs leading-6 text-[#6b7867]">
            Email chỉ được gửi khi bấm nút bên dưới. Trạng thái xử lý của lời
            nhắn được cập nhật riêng sau khi bạn giải quyết xong.
          </p>
        )}
        <Button
          type="submit"
          disabled={
            sending ||
            !configured ||
            (result !== null && result.status !== "pending")
          }
        >
          <Mail className="size-4" />
          {sending
            ? "Đang gửi phản hồi..."
            : attempted
              ? "Kiểm tra / tiếp tục phản hồi"
              : "Gửi phản hồi qua email"}
        </Button>
      </form>
      {result ? (
        <div role="status" className="rounded-lg bg-white p-3 text-sm">
          <p>{inquiryEmailStatusLabels[result.status]}</p>
          {result.error_message ? (
            <p className="mt-1 text-red-800">{result.error_message}</p>
          ) : null}
          <p className="mt-1 text-xs text-[#788273]">
            Máy chủ tiếp nhận chưa bảo đảm email vào hộp thư đến.
          </p>
        </div>
      ) : null}
      <details>
        <summary className="cursor-pointer text-sm font-medium">
          Lịch sử phản hồi ({history.length} gần nhất)
        </summary>
        {history.length ? (
          <ul className="mt-3 space-y-3">
            {history.map((reply) => (
              <li key={reply.id} className="rounded-lg bg-white p-3 text-sm">
                <p className="font-medium">{reply.subject}</p>
                <p className="mt-1 text-xs text-[#788273]">
                  {date(reply.created_at)} · {reply.recipient_email} ·{" "}
                  {inquiryEmailStatusLabels[reply.status]}
                </p>
                <p className="mt-3 whitespace-pre-wrap leading-6">
                  {reply.body}
                </p>
                {reply.error_message ? (
                  <p className="mt-2 text-red-800">{reply.error_message}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[#6b7867]">
            Chưa có phản hồi qua website cho lời nhắn này.
          </p>
        )}
      </details>
    </section>
  );
}
