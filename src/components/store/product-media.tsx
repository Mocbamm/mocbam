"use client";

import Image from "./image";
import { useState } from "react";
import type { Product } from "@/lib/types";

export function productImages(product: Product) {
  return [
    ...new Set(
      [product.image_url, ...(product.image_urls || [])].filter(Boolean),
    ),
  ];
}

export function ProductGallery({
  product,
  variantImage,
}: {
  product: Product;
  variantImage?: string;
}) {
  const images = [
    ...new Set(
      [variantImage, ...productImages(product)].filter(
        (image): image is string => Boolean(image),
      ),
    ),
  ];
  const [selected, setSelected] = useState(0);
  const videoSelected =
    selected === images.length && Boolean(product.video_url);
  return (
    <div className="store-product-gallery">
      <div className="store-product-gallery-main">
        {videoSelected ? (
          <video
            controls
            playsInline
            preload="metadata"
            className="store-product-gallery-video"
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
            className="store-product-image-link disabled:cursor-default"
          >
            <Image
              src={images[selected] || product.image_url}
              alt={`${product.name} — ảnh ${selected + 1}`}
              fill
              preload={selected === 0}
              sizes="(max-width: 767px) 95vw, 58vw"
              className="object-cover"
            />
          </button>
        )}
      </div>
      {images.length > 1 || product.video_url ? (
        <div
          className="store-product-gallery-thumbnails"
          aria-label="Chọn ảnh hoặc video sản phẩm"
        >
          {images.map((url, index) => (
            <button
              type="button"
              key={url}
              onClick={() => setSelected(index)}
              aria-label={`Ảnh ${index + 1} của ${product.name}`}
              aria-pressed={selected === index}
              className="store-product-gallery-thumbnail"
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
              className="store-product-gallery-thumbnail store-product-gallery-video-button"
            >
              Xem video
            </button>
          ) : null}
        </div>
      ) : null}
      {images.length > 1 && !videoSelected ? (
        <p aria-live="polite" className="store-product-gallery-hint">
          Ảnh {selected + 1}/{images.length} · Bấm ảnh để xem góc khác
        </p>
      ) : null}
    </div>
  );
}
