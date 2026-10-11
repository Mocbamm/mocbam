"use client";

import { Children, useEffect, useState, type ReactNode } from "react";

const SLIDE_DURATION = 6000;

export function HeroSlideshow({
  children,
  labels,
}: {
  children: ReactNode;
  labels: string[];
}) {
  const slides = Children.toArray(children);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const timer = window.setTimeout(
      () => setActive((current) => (current + 1) % slides.length),
      SLIDE_DURATION,
    );
    return () => window.clearTimeout(timer);
  }, [active, paused, reducedMotion, slides.length]);

  return (
    <div
      className="store-hero-slides"
      aria-roledescription="carousel"
      aria-label="Banner Mộc Bàm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={index}
          className="store-hero-slide"
          data-active={index === active}
          aria-roledescription="slide"
          aria-label={`${index + 1} / ${slides.length}`}
          aria-hidden={index !== active}
        >
          {slide}
        </div>
      ))}
      {slides.length > 1 ? (
        <div className="store-hero-dots">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Xem banner ${index + 1}: ${labels[index] || ""}`}
              aria-current={index === active}
              onClick={() => setActive(index)}
            >
              <span />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
