"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/types";

export function productImages(product: Product) {
  return [
    ...new Set(
      [product.image_url, ...(product.image_urls || [])].filter(Boolean),
    ),
  ];
}

export function ProductGallery({ product }: { product: Product }) {
  const images = productImages(product);
  const [selected, setSelected] = useState(0);
  const videoSelected =
    selected === images.length && Boolean(product.video_url);
  return (
    <div>
      <div className="relative aspect-square overflow-hidden bg-[#e8ecdf]">
        {videoSelected ? (
          <video
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-contain"
            poster={product.image_url}
            aria-label={`Video ${product.name}`}
          >
            <source src={product.video_url} />
            Trình duyệt chưa hỗ trợ video này.
          </video>
        ) : (
          <button
            type="button"
            disabled={images.length < 2}
            onClick={() => setSelected((index) => (index + 1) % images.length)}
            aria-label={
              images.length > 1
                ? `Xem ảnh tiếp theo của ${product.name}`
                : `Ảnh ${product.name}`
            }
            className="relative block h-full w-full disabled:cursor-default"
          >
            <Image
              src={images[selected] || product.image_url}
              alt={`${product.name} — ảnh ${selected + 1}`}
              fill
              preload={selected === 0}
              sizes="(max-width: 768px) 95vw, 50vw"
              className="object-cover"
            />
          </button>
        )}
      </div>
      {images.length > 1 || product.video_url ? (
        <div
          className="mt-3 flex flex-wrap gap-2"
          aria-label="Chọn ảnh hoặc video sản phẩm"
        >
          {images.map((url, index) => (
            <button
              type="button"
              key={url}
              onClick={() => setSelected(index)}
              aria-label={`Ảnh ${index + 1} của ${product.name}`}
              aria-pressed={selected === index}
              className={`relative h-16 w-16 overflow-hidden border-2 ${selected === index ? "border-[#29412d]" : "border-transparent"}`}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
          {product.video_url ? (
            <button
              type="button"
              onClick={() => setSelected(images.length)}
              aria-pressed={videoSelected}
              className={`h-16 border-2 px-4 text-xs ${videoSelected ? "border-[#29412d]" : "border-[#d8ddce]"}`}
            >
              Xem video
            </button>
          ) : null}
        </div>
      ) : null}
      {images.length > 1 && !videoSelected ? (
        <p aria-live="polite" className="mt-2 text-xs text-[#7a866a]">
          Ảnh {selected + 1}/{images.length} · Bấm ảnh để xem góc khác
        </p>
      ) : null}
    </div>
  );
}
