import { beforeEach, describe, expect, it, vi } from "vitest";
import { quoteDiscount } from "@/lib/promotions";
import type { Discount } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  createService: vi.fn(),
  discount: vi.fn(),
  products: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceSupabase: mocks.createService,
}));
const voucher: Discount = {
  id: "voucher",
  code: "MOC10",
  title: "Voucher sản phẩm",
  description: "",
  kind: "percentage",
  value: 10,
  min_subtotal: 0,
  max_discount: null,
  starts_at: null,
  ends_at: null,
  active: true,
  public_campaign: true,
  scope: "product",
  product_ids: ["plant"],
  customer_user_ids: [],
  customer_user_id: null,
  max_uses: null,
  used_count: 0,
  created_at: "2026-10-01T00:00:00Z",
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.createService.mockReturnValue({
    from: (table: string) =>
      table === "discounts"
        ? { select: () => ({ eq: () => ({ maybeSingle: mocks.discount }) }) }
        : { select: () => ({ in: mocks.products }) },
  });
  mocks.discount.mockResolvedValue({ data: voucher, error: null });
  mocks.products.mockResolvedValue({
    data: [
      { id: "plant", price: 100000, stock: 10, active: true, variants: [] },
      { id: "pot", price: 200000, stock: 10, active: true, variants: [] },
    ],
    error: null,
  });
});

describe("promotion scope previews", () => {
  it("prices the whole basket while applying the reduction only to selected product lines", async () => {
    expect(
      await quoteDiscount(
        "MOC10",
        [
          { product_id: "plant", quantity: 2 },
          { product_id: "pot", quantity: 1 },
        ],
        null,
      ),
    ).toMatchObject({ subtotal: 400000, discount_amount: 20000 });
    await expect(
      quoteDiscount("MOC10", [{ product_id: "pot", quantity: 1 }], null),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("uses selected variant price and stock rather than the parent listing", async () => {
    mocks.products.mockResolvedValue({
      data: [
        {
          id: "plant",
          price: 100000,
          stock: 10,
          active: true,
          variants: [{ id: "blue", price: 150000, stock: 2, active: true }],
        },
      ],
      error: null,
    });
    expect(
      await quoteDiscount(
        "MOC10",
        [{ product_id: "plant", variant_id: "blue", quantity: 2 }],
        null,
      ),
    ).toMatchObject({ subtotal: 300000, discount_amount: 30000 });
    await expect(
      quoteDiscount("MOC10", [{ product_id: "plant", quantity: 1 }], null),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      quoteDiscount(
        "MOC10",
        [{ product_id: "plant", variant_id: "blue", quantity: 3 }],
        null,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("limits fixed reductions to the eligible subtotal and enforces the full basket minimum", async () => {
    mocks.discount.mockResolvedValue({
      data: { ...voucher, kind: "fixed", value: 500000, min_subtotal: 250000 },
      error: null,
    });
    expect(
      await quoteDiscount(
        "MOC10",
        [
          { product_id: "plant", quantity: 1 },
          { product_id: "pot", quantity: 1 },
        ],
        null,
      ),
    ).toMatchObject({ discount_amount: 100000 });
    await expect(
      quoteDiscount("MOC10", [{ product_id: "plant", quantity: 1 }], null),
    ).rejects.toMatchObject({ status: 409 });
  });
});
