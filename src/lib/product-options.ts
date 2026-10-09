import type { Product } from "./types";

export function productOption(
  product: Product,
  variantId?: string,
): Product | null {
  if (!product.variants?.length) return variantId ? null : product;
  const variant = product.variants.find(
    (item) => item.id === variantId && item.active,
  );
  if (!variant) return null;
  return {
    ...product,
    name: `${product.name} — ${variant.name}`,
    price: variant.price,
    stock: variant.stock,
    image_url: variant.image_url || product.image_url,
  };
}
export function cartItemKey(productId: string, variantId?: string) {
  return variantId ? `${productId}:${variantId}` : productId;
}
