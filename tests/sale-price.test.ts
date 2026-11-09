import { describe, expect, it } from "vitest";
import { cartSale, salePrice, type ShopSale } from "@/lib/sale-price";

const sale: ShopSale = {
  code: "KHAITRUONG10",
  kind: "percentage",
  value: 10,
  min_subtotal: 0,
  max_discount: 100000,
  scope: "shop",
  product_ids: [],
  ends_at: "2026-11-11T16:59:00+00:00",
};
const now = Date.parse("2026-11-10T10:00:00Z");

describe("sale price", () => {
  it("takes 10% off one unit, rounded down like the order transaction", () => {
    expect(salePrice([sale], "a", 189000, now)).toEqual({
      price: 170100,
      code: "KHAITRUONG10",
    });
    expect(salePrice([sale], "a", 12345, now)?.price).toBe(12345 - 1234);
  });
  it("respects the cap, the end time, scope and minimum", () => {
    expect(salePrice([sale], "a", 2000000, now)?.price).toBe(1900000);
    expect(
      salePrice([sale], "a", 189000, Date.parse(sale.ends_at!)),
    ).toBeNull();
    expect(
      salePrice(
        [{ ...sale, scope: "product", product_ids: ["b"] }],
        "a",
        1e5,
        now,
      ),
    ).toBeNull();
    expect(
      salePrice([{ ...sale, min_subtotal: 200000 }], "a", 1e5, now),
    ).toBeNull();
    expect(salePrice([], "a", 1e5, now)).toBeNull();
  });
  it("caps the cart discount once per order", () => {
    const lines = [
      { product_id: "a", price: 600000, quantity: 1 },
      { product_id: "b", price: 300000, quantity: 2 },
    ];
    expect(cartSale([sale], lines, now)).toEqual({
      code: "KHAITRUONG10",
      amount: 100000,
    });
    expect(
      cartSale(
        [{ ...sale, scope: "product", product_ids: ["b"], max_discount: null }],
        lines,
        now,
      )?.amount,
    ).toBe(60000);
  });
});
