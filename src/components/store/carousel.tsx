"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function StoreCarousel({
  label,
  children,
  itemCount,
  itemClassName,
}: {
  label: string;
  children: React.ReactNode[];
  itemCount: number;
  itemClassName: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const id = useId();
  const [position, setPosition] = useState({
    overflow: false,
    previous: false,
    next: false,
  });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => {
      const remaining =
        element.scrollWidth - element.clientWidth - element.scrollLeft;
      setPosition({
        overflow: element.scrollWidth > element.clientWidth + 2,
        previous: element.scrollLeft > 2,
        next: remaining > 2,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [itemCount]);
  function scroll(direction: number) {
    const element = viewport.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <div role="region" aria-label={label} aria-roledescription="băng chuyền">
      {position.overflow ? (
        <div className="mb-4 flex justify-end gap-2">
          <button
            type="button"
            aria-label={`${label}: xem trước`}
            aria-controls={id}
            disabled={!position.previous}
            onClick={() => scroll(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c3cdb7] text-[#29412d] disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label={`${label}: xem tiếp`}
            aria-controls={id}
            disabled={!position.next}
            onClick={() => scroll(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c3cdb7] text-[#29412d] disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : null}
      <div
        ref={viewport}
        id={id}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [scrollbar-width:thin]"
      >
        {children.map((child, index) => (
          <div
            key={index}
            className={`min-w-0 shrink-0 snap-start ${itemClassName}`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
