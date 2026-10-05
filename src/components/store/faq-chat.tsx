"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Leaf } from "lucide-react";
import {
  boundedHistory,
  chatGreeting,
  chatHistorySchema,
  type ChatMessage,
} from "@/lib/chat-history";
import { ContactForm } from "./contact";
const answers = [
  {
    question: "Mộc Bàm bán những gì?",
    keywords: ["sản phẩm", "bán", "móc", "vòng", "gỗ"],
    answer:
      "Mộc có hai dòng: những nhân vật gỗ nhỏ xinh và dòng chuỗi mộc mạc. Bạn có thể xem hình, giá và số lượng còn hàng tại trang Sản phẩm.",
  },
  {
    question: "Đặt hàng như thế nào?",
    keywords: ["đặt", "mua", "giỏ"],
    answer:
      "Chọn điều bạn thích, thêm vào giỏ rồi điền thông tin nhận hàng. Sau khi gửi đơn, bạn sẽ nhận mã đơn và trạng thái để theo dõi. Giá và tồn kho được kiểm tra khi gửi đơn.",
  },
  {
    question: "Thanh toán ra sao?",
    keywords: ["thanh toán", "chuyển khoản", "payment"],
    answer:
      "Bạn có thể thanh toán khi nhận hàng (COD). Chuyển khoản ngân hàng sẽ xuất hiện ở bước đặt hàng khi cửa hàng cập nhật tài khoản nhận tiền; sau khi đặt, đơn sẽ có thông tin và mã QR riêng. Mộc kiểm tra giao dịch và xác nhận thanh toán thủ công.",
  },
  {
    question: "Phí giao hàng là bao nhiêu?",
    keywords: ["giao", "ship", "vận chuyển", "phí"],
    answer:
      "Phí giao hàng hiển thị rõ tại bước xác nhận đơn. Mộc chưa tích hợp hãng vận chuyển; nếu cần trao đổi thời gian nhận, hãy để lại ghi chú hoặc liên hệ với shop.",
  },
  {
    question: "Có thể đổi trả không?",
    keywords: ["đổi", "trả", "hỏng", "lỗi"],
    answer:
      "Nếu sản phẩm có vấn đề, hãy gửi Mộc mã đơn và thông tin sản phẩm qua trang Liên hệ. Bạn có thể xem hướng dẫn đổi trả trong mục Chính sách của cửa hàng.",
  },
];
export function FaqChat({
  userId,
  configured = false,
  shopHours,
  name,
  email,
  phone,
}: {
  userId?: string;
  configured?: boolean;
  shopHours: string;
  name?: string;
  email?: string;
  phone?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([chatGreeting]);
  const [loaded, setLoaded] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  const [handoff, setHandoff] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const storageKey = `mocbam.chat.v1.${userId || "guest"}`;
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let cached: ChatMessage[] = [];
      try {
        const result = chatHistorySchema.safeParse(
          JSON.parse(localStorage.getItem(storageKey) || "{}"),
        );
        if (result.success) cached = result.data.messages;
      } catch {
        /* Storage may be blocked. */
      }
      if (userId && configured) {
        try {
          const response = await fetch("/api/account/chat", {
            cache: "no-store",
          });
          if (!response.ok) throw new Error("Cannot load history");
          const result = chatHistorySchema.safeParse(await response.json());
          if (!result.success) throw new Error("Invalid history");
          const remote = result.data.messages;
          // Keep locally queued messages only when they extend the same history.
          const extendsRemote =
            cached.length > remote.length &&
            remote.every(
              (message, index) =>
                message.from === cached[index]?.from &&
                message.text === cached[index]?.text,
            );
          if (remote.length && !extendsRemote) cached = remote;
          if (!cancelled) setRemoteReady(true);
        } catch {
          if (!cancelled) setSaveError(true);
        }
      }
      if (!cancelled) {
        setMessages(cached.length ? cached : [chatGreeting]);
        setLoaded(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [storageKey, userId, configured]);
  useEffect(() => {
    if (!loaded) return;
    const payload = { messages: boundedHistory(messages) };
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      /* Storage may be blocked. */
    }
    if (!userId || !configured || !remoteReady) return;
    // Serialize writes and start immediately so navigation does not discard a
    // pending debounce. A failed initial read must never overwrite remote data.
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        const response = await fetch("/api/account/chat", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
        setSaveError(!response.ok);
      } catch {
        setSaveError(true);
      }
    });
  }, [messages, loaded, remoteReady, storageKey, userId, configured]);
  function ask(question: string) {
    if (!loaded) return;
    const normalized = question.toLocaleLowerCase("vi");
    const answer = answers.find((a) =>
      a.keywords.some((k) => normalized.includes(k)),
    );
    setMessages((previous) =>
      boundedHistory([
        ...previous,
        { from: "you", text: question },
        {
          from: "shop",
          text:
            answer?.answer ||
            `Mộc cần nhờ nhân viên kiểm tra thêm câu hỏi này. Bạn bấm “Gửi cho nhân viên” bên dưới và để lại email hoặc số điện thoại để được hỗ trợ. Nhân viên sẽ phản hồi trong giờ làm việc: ${shopHours || "9:00–18:00"}.`,
        },
      ]),
    );
    setInput("");
  }
  return (
    <div className="fixed bottom-6 right-5 z-40 sm:right-7">
      {open ? (
        <section
          aria-label="Trợ lý Mộc Bàm"
          className="mb-3 flex h-[480px] max-h-[75dvh] w-[calc(100vw-40px)] max-w-[340px] flex-col border border-[#d7ddcd] bg-[#faf9f3] shadow-2xl"
        >
          <div className="flex items-center justify-between bg-[#29412d] px-5 py-4 text-white">
            <div>
              <p className="flex items-center gap-2 text-sm">
                <Leaf size={15} /> Một chút Mộc
              </p>
              <p className="mt-1 text-[10px] text-[#c9d3bf]">
                Trợ lý câu hỏi thường gặp
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng trò chuyện"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="flex-1 space-y-3 overflow-auto px-4 py-4"
            aria-live="polite"
          >
            {!handoff ? (
              <>
                {messages.map((m, i) => (
                  <p
                    key={i}
                    className={`max-w-[92%] rounded-xl px-3 py-2.5 text-xs leading-6 ${m.from === "shop" ? "bg-[#e9edde] text-[#3f5138]" : "ml-auto bg-[#29412d] text-white"}`}
                  >
                    {m.text}
                  </p>
                ))}
                {messages.length === 1 ? (
                  <div className="space-y-2">
                    {answers.map((a) => (
                      <button
                        key={a.question}
                        disabled={!loaded}
                        onClick={() => ask(a.question)}
                        className="block rounded-full border border-[#cbd4be] px-3 py-1.5 text-[11px] text-[#58734a]"
                      >
                        {a.question}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
            {saveError ? (
              <p role="status" className="text-[11px] leading-5">
                Chưa đồng bộ được lịch sử lên tài khoản. Cuộc trò chuyện vẫn
                được lưu trên trình duyệt nếu trình duyệt cho phép.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setHandoff(!handoff)}
              className="text-[11px] underline underline-offset-4"
            >
              {handoff ? "Quay lại trò chuyện" : "Gửi cho nhân viên"}
            </button>
            {handoff ? (
              <div className="border-t border-[#d7ddcd] pt-4">
                <p className="mb-4 text-xs leading-6">
                  Mộc sẽ trả lời qua thông tin bạn để lại. Giờ làm việc:{" "}
                  {shopHours || "9:00–18:00"}.
                </p>
                <ContactForm
                  configured={configured}
                  idPrefix="chat-contact"
                  initial={{
                    name,
                    email,
                    phone,
                    message: messages
                      .filter((m) => m.from === "you")
                      .slice(-6)
                      .map((m) => m.text)
                      .join("\n")
                      .slice(0, 4000),
                  }}
                />
              </div>
            ) : null}
            <Link
              href="/lien-he"
              className="inline-block text-[11px] underline underline-offset-4"
            >
              Gửi lời nhắn cho Mộc
            </Link>
          </div>
          {!handoff ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (loaded && input.trim()) ask(input.trim().slice(0, 500));
              }}
              className="flex border-t border-[#d7ddcd] p-3"
            >
              <label htmlFor="chat-message" className="sr-only">
                Câu hỏi của bạn
              </label>
              <input
                id="chat-message"
                maxLength={500}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi Mộc một chút..."
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
              <button
                type="submit"
                disabled={!loaded || !input.trim()}
                aria-label="Gửi câu hỏi"
                className="p-2 text-[#29412d] disabled:opacity-30"
              >
                <Send size={16} />
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Đóng trợ lý" : "Trò chuyện với Mộc"}
        aria-expanded={open}
        className="ml-auto flex h-12 items-center gap-2 rounded-full bg-[#29412d] px-4 text-xs text-[#f1f1df] shadow-lg"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
        <span className="hidden sm:inline">Hỏi Mộc nhé</span>
      </button>
    </div>
  );
}
