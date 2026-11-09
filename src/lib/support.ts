// Shared by the chat bubble on every storefront page, so it must stay free
// of zod; the request schema lives in support-schema.ts.
export type SupportMessage = {
  id: number;
  user_id: string;
  sender: "customer" | "staff";
  body: string;
  created_at: string;
};
export type SupportThread = {
  user_id: string;
  resolved: boolean;
  updated_at: string;
  profile: { full_name: string; email: string; phone: string };
  messages: SupportMessage[];
};

export function mergeSupportMessages(
  previous: SupportMessage[],
  incoming: SupportMessage[],
) {
  const byId = new Map(previous.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id).slice(-200);
}

export function supportAcknowledgement(hours: string) {
  return `Cảm ơn bạn đã nhắn cho Mộc Bàm! Mộc Bàm đã ghi nhận câu hỏi của bạn và sẽ nhờ nhân viên kiểm tra lại. Bạn vui lòng đợi Mộc Bàm phản hồi trong giờ làm việc (${hours || "Thứ 2 – Thứ 7, từ 09:00 – 18:00"}) nhé.`;
}
