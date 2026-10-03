import { describe, expect, it } from "vitest";
import { validateStoredCart } from "../src/lib/cart";
import { demoProducts } from "../src/lib/demo-data";

describe("persisted shopping cart", () => {
  it("discards unknown items, negative/fractional quantities and duplicates", () => {
    const id = demoProducts[0].id;
    expect(
      validateStoredCart(
        [
          { product_id: id, quantity: 2 },
          { product_id: id, quantity: 3 },
          { product_id: "unknown", quantity: 2 },
          { product_id: demoProducts[1].id, quantity: -1 },
          { product_id: demoProducts[2].id, quantity: 1.5 },
        ],
        demoProducts,
      ),
    ).toEqual([{ product_id: id, quantity: 2 }]);
  });
  it("caps by current stock and removes products no longer for sale", () => {
    const products = [
      { ...demoProducts[0], stock: 3 },
      { ...demoProducts[1], active: false },
      { ...demoProducts[2], stock: 0 },
    ];
    expect(
      validateStoredCart(
        products.map((p) => ({ product_id: p.id, quantity: 99 })),
        products,
      ),
    ).toEqual([{ product_id: products[0].id, quantity: 3 }]);
  });
  it("handles corrupt cache without crashing", () => {
    for (const input of [null, {}, "invalid", [null, {}]])
      expect(validateStoredCart(input, demoProducts)).toEqual([]);
  });
});
