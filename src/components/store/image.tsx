"use client";

import NextImage, { type ImageProps } from "next/image";
import { useState } from "react";

import { storefrontImageSource } from "@/lib/storefront-media";

export default function StoreImage({
  src,
  fallbackSrc,
  onError,
  ...props
}: ImageProps & { fallbackSrc?: string }) {
  const source = typeof src === "string" ? storefrontImageSource(src) : src;
  const [failedSource, setFailedSource] = useState<ImageProps["src"]>();
  return (
    <NextImage
      {...props}
      src={fallbackSrc && failedSource === source ? fallbackSrc : source}
      onError={(event) => {
        if (fallbackSrc && failedSource !== source) setFailedSource(source);
        onError?.(event);
      }}
    />
  );
}
