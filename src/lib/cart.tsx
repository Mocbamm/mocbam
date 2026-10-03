"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { Product } from "@/lib/types";
import { trackStoreEvent } from "@/lib/analytics";
import { toast } from "sonner";
const STORAGE_KEY = "mocbam.cart.v1";
const MAX_QUANTITY = 10;
type StoredItem = { product_id: string; quantity: number };
export type CartItem = { product: Product; quantity: number };
type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (product: Product, quantity?: number) => boolean;
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
      seen.has(item.product_id)
    )
      return [];
    const product = catalog.get(item.product_id);
    if (!product || product.stock < 1 || item.quantity < 1) return [];
    seen.add(item.product_id);
    return [
      {
        product_id: product.id,
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
        return product ? [{ product, quantity: item.quantity }] : [];
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
  function add(product: Product, quantity = 1) {
    const catalogProduct = products.find(
      (p) => p.id === product.id && p.active,
    );
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
    const found = current.find((i) => i.product_id === product.id);
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
            i.product_id === product.id
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          )
        : [...current, { product_id: product.id, quantity }],
    );
    trackStoreEvent("add_to_cart", {
      currency: "VND",
      value: product.price * quantity,
      items: [
        {
          item_id: product.id,
          item_name: product.name,
          price: product.price,
          quantity,
        },
      ],
      content_ids: [product.id],
      content_type: "product",
    });
    toast.success("Đã thêm vào giỏ hàng");
    return true;
  }
  function update(id: string, quantity: number) {
    const product = products.find((p) => p.id === id);
    if (!product || !Number.isInteger(quantity)) return;
    const current = currentCart();
    persist(
      quantity < 1
        ? current.filter((i) => i.product_id !== id)
        : current.map((i) =>
            i.product_id === id
              ? {
                  ...i,
                  quantity: Math.min(quantity, MAX_QUANTITY, product.stock),
                }
              : i,
          ),
    );
  }
  const value = {
    items,
    count: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    ready,
    add,
    update,
    remove: (id: string) =>
      persist(currentCart().filter((i) => i.product_id !== id)),
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
