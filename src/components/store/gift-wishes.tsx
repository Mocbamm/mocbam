"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";
import { useState, type CSSProperties } from "react";

// Owner brief 19/11: wording to borrow when giving a Mộc Bàm gift. The
// shopper picks an occasion and reads one message at a time.
const wishes = [
  {
    occasion: "Khi muốn chúc điều tốt lành",
    chip: "Chúc điều tốt lành",
    words:
      "Mình gửi bạn một chút bình an. Mong mọi chuyện của bạn đều nhẹ nhàng.",
  },
  {
    occasion: "Khi người ấy đang bận rộn",
    chip: "Người ấy đang bận rộn",
    words:
      "Dạo này bạn vất vả rồi. Để món này ở cạnh bạn, nhớ nghỉ một chút nhé.",
  },
  {
    occasion: "Khi người ấy bắt đầu điều mới",
    chip: "Bắt đầu điều mới",
    words: "Chúc bạn khởi đầu thuận lợi. Có hạt đậu bình an đi cùng rồi.",
  },
  {
    occasion: "Khi muốn nói lời cảm ơn",
    chip: "Lời cảm ơn",
    words: "Cảm ơn bạn vì đã luôn ở đó. Chúc bạn luôn bình an.",
  },
  {
    occasion: "Nếu chưa biết nói gì",
    chip: "Chưa biết nói gì",
    words:
      "Bạn nghiêng nhẹ thử nhé. Tiếng hạt đậu nhỏ bên trong là lời chúc của mình dành cho bạn.",
  },
];

// Option B, card deck (19/11): the messages sit in a small stack of cream
// cards. “Lá tiếp theo” slips the top card to the back of the deck.
export function GiftWishes() {
  const [top, setTop] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const wish = wishes[top];

  function next() {
    if (leaving) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setTop((current) => (current + 1) % wishes.length);
      return;
    }
    setLeaving(true);
    window.setTimeout(() => {
      setTop((current) => (current + 1) % wishes.length);
      setLeaving(false);
    }, 260);
  }

  return (
    <section
      className="store-container store-home-gifts"
      aria-labelledby="gift-wishes-title"
    >
      <div className="store-gifts-copy">
        <h2 id="gift-wishes-title" className="store-section-heading">
          Gửi quà, gửi cả lời chúc
        </h2>
        <p>
          Bình an đôi khi chỉ cần một câu nói nhỏ. Khi trao quà, bạn có thể mượn
          một trong những câu dưới đây, rồi chọn món quà hợp với người ấy.
        </p>
        <div className="store-gifts-actions">
          <button
            type="button"
            className="store-button store-button-outline"
            onClick={next}
          >
            Lá tiếp theo
            <RotateCw size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <Link href="/san-pham" className="store-button store-button-primary">
            Chọn một món quà
          </Link>
        </div>
      </div>
      <div className="store-gift-deck">
        {wishes.map((item, index) => {
          const depth = (index - top + wishes.length) % wishes.length;
          const front = depth === 0;
          return (
            <article
              key={item.occasion}
              className="store-gift-note"
              data-depth={depth}
              data-leaving={front && leaving ? "" : undefined}
              aria-hidden="true"
              style={{ "--depth": depth } as CSSProperties}
              onClick={front ? next : undefined}
            >
              <p className="store-gift-note-occasion">{item.occasion}</p>
              <blockquote>“{item.words}”</blockquote>
              <p className="store-gift-note-count">
                {index + 1} / {wishes.length}
              </p>
            </article>
          );
        })}
        {/* The cards are decoration; this line is what screen readers hear. */}
        <p className="sr-only" aria-live="polite">
          {wish.occasion}: {wish.words}
        </p>
      </div>
    </section>
  );
}
