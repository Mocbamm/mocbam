"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./catalog.css";

export function StoreCarousel({
  label,
  children,
  itemCount,
  itemClassName,
  heading,
  action,
}: {
  label: string;
  children: React.ReactNode[];
  itemCount: number;
  itemClassName: string;
  heading?: React.ReactNode;
  action?: React.ReactNode;
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
    <div
      className="store-carousel"
      role="region"
      aria-label={label}
      aria-roledescription="băng chuyền"
    >
      {heading || action || position.overflow ? (
        <div className="store-carousel-header">
          {heading}
          <div className="store-carousel-controls">
            {action ? (
              <div className="store-carousel-action">{action}</div>
            ) : null}
            {position.overflow ? (
              <>
                <button
                  type="button"
                  aria-label={`${label}: xem trước`}
                  aria-controls={id}
                  disabled={!position.previous}
                  onClick={() => scroll(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  aria-label={`${label}: xem tiếp`}
                  aria-controls={id}
                  disabled={!position.next}
                  onClick={() => scroll(1)}
                >
                  <ChevronRight size={18} />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      <div ref={viewport} id={id} className="store-carousel-viewport">
        {children.map((child, index) => (
          <div key={index} className={`store-carousel-item ${itemClassName}`}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
