"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Product } from "@/lib/types";
import { trackCartQuantityChange } from "@/lib/analytics";
import { toast } from "sonner";
import { cartItemKey, productOption } from "./product-options";
const STORAGE_KEY = "mocbam.cart.v1";
const MAX_QUANTITY = 10;
type StoredItem = { product_id: string; variant_id?: string; quantity: number };
export type CartItem = {
  key: string;
  product: Product;
  variant_id?: string;
  quantity: number;
};
type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (product: Product, quantity?: number, variantId?: string) => boolean;
  update: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);
const listeners = new Set<() => void>();
let memoryCart = "[]";
function snapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) || memoryCart;
  } catch {
    return memoryCart;
  }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
function persist(items: StoredItem[]) {
  memoryCart = JSON.stringify(items);
  try {
    localStorage.setItem(STORAGE_KEY, memoryCart);
  } catch {
    /* Keep the cart for this session when storage is unavailable. */
  }
  listeners.forEach((listener) => listener());
}
export function validateStoredCart(
  value: unknown,
  products: Product[],
): StoredItem[] {
  if (!Array.isArray(value)) return [];
  const catalog = new Map(
    products.filter((p) => p.active).map((p) => [p.id, p]),
  );
  const seen = new Set<string>();
  return value.slice(0, 20).flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.product_id !== "string" ||
      !Number.isInteger(item.quantity) ||
      (item.variant_id !== undefined && typeof item.variant_id !== "string") ||
      seen.has(cartItemKey(item.product_id, item.variant_id))
    )
      return [];
    const base = catalog.get(item.product_id);
    const product = base ? productOption(base, item.variant_id) : null;
    if (!product || product.stock < 1 || item.quantity < 1) return [];
    seen.add(cartItemKey(item.product_id, item.variant_id));
    return [
      {
        product_id: product.id,
        ...(item.variant_id ? { variant_id: item.variant_id } : {}),
        quantity: Math.min(item.quantity, MAX_QUANTITY, product.stock),
      },
    ];
  });
}
export function CartProvider({
  children,
  products,
}: {
  children: React.ReactNode;
  products: Product[];
}) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const stored = useMemo(() => {
    try {
      return validateStoredCart(JSON.parse(raw), products);
    } catch {
      return [];
    }
  }, [raw, products]);
  const items = useMemo(
    () =>
      stored.flatMap((item) => {
        const product = products.find(
          (p) => p.id === item.product_id && p.active,
        );
        const option = product ? productOption(product, item.variant_id) : null;
        return option
          ? [
              {
                key: cartItemKey(option.id, item.variant_id),
                product: option,
                variant_id: item.variant_id,
                quantity: item.quantity,
              },
            ]
          : [];
      }),
    [stored, products],
  );
  function currentCart() {
    try {
      return validateStoredCart(JSON.parse(snapshot()), products);
    } catch {
      return [];
    }
  }
  function add(product: Product, quantity = 1, variantId?: string) {
    const base = products.find((p) => p.id === product.id && p.active);
    const catalogProduct = base ? productOption(base, variantId) : null;
    if (
      !catalogProduct ||
      catalogProduct.stock < 1 ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      toast.error("Sản phẩm hiện đã hết hàng.");
      return false;
    }
    const current = currentCart();
    const key = cartItemKey(product.id, variantId);
    const found = current.find(
      (i) => cartItemKey(i.product_id, i.variant_id) === key,
    );
    const maximum = Math.min(MAX_QUANTITY, catalogProduct.stock);
    if ((found?.quantity || 0) + quantity > maximum) {
      toast.error(`Bạn có thể chọn tối đa ${maximum} sản phẩm này.`);
      return false;
    }
    if (!found && current.length >= 20) {
      toast.error("Giỏ hàng có thể chứa tối đa 20 sản phẩm khác nhau.");
      return false;
    }
    persist(
      found
        ? current.map((i) =>
            cartItemKey(i.product_id, i.variant_id) === key
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          )
        : [
            ...current,
            {
              product_id: product.id,
              ...(variantId ? { variant_id: variantId } : {}),
              quantity,
            },
          ],
    );
    trackCartQuantityChange(
      catalogProduct,
      found?.quantity || 0,
      (found?.quantity || 0) + quantity,
    );
    toast.success("Đã thêm vào giỏ hàng");
    return true;
  }
  function update(id: string, quantity: number) {
    if (!Number.isInteger(quantity)) return;
    const current = currentCart();
    const item = current.find(
      (i) => cartItemKey(i.product_id, i.variant_id) === id,
    );
    if (!item) return;
    const base = products.find((p) => p.id === item.product_id && p.active);
    const product = base ? productOption(base, item.variant_id) : null;
    if (!product) return;
    const nextQuantity = Math.max(
      0,
      Math.min(quantity, MAX_QUANTITY, product.stock),
    );
    const delta = nextQuantity - item.quantity;
    if (!delta) return;
    persist(
      nextQuantity === 0
        ? current.filter((i) => cartItemKey(i.product_id, i.variant_id) !== id)
        : current.map((i) =>
            cartItemKey(i.product_id, i.variant_id) === id
              ? { ...i, quantity: nextQuantity }
              : i,
          ),
    );
    trackCartQuantityChange(product, item.quantity, nextQuantity);
  }
  const value = {
    items,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    ready,
    add,
    update,
    remove: (id: string) => update(id, 0),
    clear: () => persist([]),
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be inside CartProvider");
  return context;
}
export function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
