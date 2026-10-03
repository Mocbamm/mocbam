"use client";
import { useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Leaf } from "lucide-react";
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
      "Nếu sản phẩm có vấn đề, hãy nhắn Mộc cùng mã đơn và ảnh sản phẩm. Chính sách ở website hiện là bản dự thảo cho dự án; shop sẽ trao đổi trực tiếp trước khi xử lý.",
  },
];
export function FaqChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<
    { from: "shop" | "you"; text: string }[]
  >([
    {
      from: "shop",
      text: "Chào bạn, mình là trợ lý nhỏ của Mộc 🌿 Bạn muốn tìm hiểu điều gì?",
    },
  ]);
  function ask(question: string) {
    const normalized = question.toLocaleLowerCase("vi");
    const answer = answers.find((a) =>
      a.keywords.some((k) => normalized.includes(k)),
    );
    setMessages((previous) => [
      ...previous,
      { from: "you", text: question },
      {
        from: "shop",
        text:
          answer?.answer ||
          "Mình chưa có câu trả lời cho điều này. Bạn có thể gửi lời nhắn ở trang Liên hệ; Mộc sẽ trao đổi thêm với bạn nhé.",
      },
    ]);
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
                    onClick={() => ask(a.question)}
                    className="block rounded-full border border-[#cbd4be] px-3 py-1.5 text-[11px] text-[#58734a]"
                  >
                    {a.question}
                  </button>
                ))}
              </div>
            ) : null}
            <Link
              href="/lien-he"
              className="inline-block text-[11px] underline underline-offset-4"
            >
              Gửi lời nhắn cho Mộc
            </Link>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) ask(input.trim().slice(0, 500));
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
              disabled={!input.trim()}
              aria-label="Gửi câu hỏi"
              className="p-2 text-[#29412d] disabled:opacity-30"
            >
              <Send size={16} />
            </button>
          </form>
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
