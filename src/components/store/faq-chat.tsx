"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Leaf } from "lucide-react";
import {
  mergeSupportMessages,
  supportAcknowledgement,
  type SupportMessage,
} from "@/lib/support";

export function FaqChat({
  userId,
  configured = false,
  shopHours,
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
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/account/support", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Chưa tải được trò chuyện.");
      setMessages((previous) => mergeSupportMessages(previous, data.messages));
      setLoaded(true);
      setError("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Chưa kết nối được với Mộc.",
      );
    }
  }, []);
  useEffect(() => {
    if (!open || !userId || !configured) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [open, userId, configured, load]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  async function send() {
    const body = input.trim();
    if (!body || busy || !loaded) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Chưa gửi được lời nhắn.");
      setMessages((previous) => mergeSupportMessages(previous, [data.message]));
      setInput("");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Chưa gửi được lời nhắn.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="fixed bottom-6 right-5 z-40 sm:right-7">
      {open ? (
        <section
          aria-label="Trò chuyện với Mộc Bàm"
          className="mb-3 flex h-[480px] max-h-[75dvh] w-[calc(100vw-40px)] max-w-[360px] flex-col border border-[#d7ddcd] bg-[#faf9f3] shadow-2xl"
        >
          <div className="flex items-center justify-between bg-[#29412d] px-5 py-4 text-white">
            <div>
              <p className="flex items-center gap-2 text-sm">
                <Leaf size={15} /> Mộc luôn lắng nghe
              </p>
              <p className="mt-1 text-[10px] text-[#c9d3bf]">
                Nhân viên trả lời trong giờ làm việc
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
          {!userId ? (
            <div className="flex-1 space-y-5 p-6 text-sm leading-7">
              <p>
                Đăng nhập để gửi câu hỏi cho Mộc, lưu cuộc trò chuyện và nhận
                phản hồi của nhân viên ngay tại đây.
              </p>
              <Link
                href="/tai-khoan"
                className="inline-block bg-[#29412d] px-5 py-2 text-white"
              >
                Đăng nhập để trò chuyện
              </Link>
              <p>
                Bạn cũng có thể{" "}
                <Link className="underline" href="/lien-he">
                  gửi lời nhắn qua trang Liên hệ
                </Link>
                .
              </p>
            </div>
          ) : !configured ? (
            <p className="p-6 text-sm">
              Trò chuyện chưa được kết nối. Bạn vui lòng liên hệ trực tiếp với
              cửa hàng.
            </p>
          ) : (
            <>
              <div
                className="flex-1 space-y-3 overflow-auto px-4 py-4"
                aria-live="polite"
              >
                <p className="rounded-xl bg-[#e9edde] px-3 py-2.5 text-xs leading-6">
                  Chào bạn, Mộc có thể giúp gì? Bạn có thể gửi mã đơn hàng để
                  Mộc tra cứu nhanh hơn.
                </p>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[92%] rounded-xl px-3 py-2.5 text-xs leading-6 ${message.sender === "staff" ? "bg-[#e9edde] text-[#3f5138]" : "ml-auto bg-[#29412d] text-white"}`}
                  >
                    <p className="mb-1 text-[10px] opacity-70">
                      {message.sender === "staff" ? "Nhân viên Mộc Bàm" : "Bạn"}
                    </p>
                    <p className="whitespace-pre-wrap break-words">
                      {message.body}
                    </p>
                  </div>
                ))}
                {messages.at(-1)?.sender === "customer" ? (
                  <p className="text-xs leading-6 text-[#58734a]">
                    {supportAcknowledgement(shopHours)}
                  </p>
                ) : null}
                {error ? (
                  <div role="alert" className="text-xs leading-6 text-red-700">
                    {error}{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => void load()}
                    >
                      Thử kết nối lại
                    </button>
                  </div>
                ) : null}
                <div ref={end} />
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
                className="flex border-t border-[#d7ddcd] p-3"
              >
                <label htmlFor="chat-message" className="sr-only">
                  Câu hỏi của bạn
                </label>
                <input
                  id="chat-message"
                  maxLength={4000}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Nhắn cho Mộc..."
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                  disabled={!loaded || busy}
                />
                <button
                  type="submit"
                  disabled={!loaded || busy || !input.trim()}
                  aria-label="Gửi câu hỏi"
                  className="p-2 text-[#29412d] disabled:opacity-30"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (!open && userId && configured) void load();
          setOpen(!open);
        }}
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
