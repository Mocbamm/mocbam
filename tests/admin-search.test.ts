import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  filterOverviewOrders,
  searchSettingsSections,
} from "@/lib/admin-search";
import { productSchema } from "@/lib/validation";

const orders = [
  {
    reference: "MB25",
    customer_name: "Đỗ Ngọc Mộc",
    email: "moc@example.com",
    phone: "0901234567",
    status: "pending" as const,
  },
  {
    reference: "MB24",
    customer_name: "Nguyễn An",
    email: "an@example.com",
    phone: "0909876543",
    status: "completed" as const,
  },
];

describe("admin overview and settings lookup", () => {
  it("combines exact status filters with case/accent-insensitive order, customer, email and phone search", () => {
    expect(filterOverviewOrders(orders, "  DO NGOC MOC ", "all")).toEqual([
      orders[0],
    ]);
    expect(filterOverviewOrders(orders, "mb24", "completed")).toEqual([
      orders[1],
    ]);
    expect(filterOverviewOrders(orders, "AN@EXAMPLE.COM", "all")).toEqual([
      orders[1],
    ]);
    expect(filterOverviewOrders(orders, "090123", "all")).toEqual([orders[0]]);
    expect(filterOverviewOrders(orders, "mb24", "pending")).toEqual([]);
    expect(filterOverviewOrders(orders, "", "all")).toEqual(orders);
  });
  it("searches all overview orders before selecting the recent six", () => {
    const many = [
      ...Array.from({ length: 10 }, (_, index) => ({
        ...orders[0],
        reference: `MB${index}`,
      })),
      orders[1],
    ];
    expect(filterOverviewOrders(many, "mb24", "all").slice(0, 6)).toEqual([
      orders[1],
    ]);
  });
  it("finds settings by section title or field name without requiring Vietnamese accents", () => {
    expect(
      searchSettingsSections("phi van chuyen").map((section) => section.id),
    ).toEqual(["settings-shipping"]);
    expect(
      searchSettingsSections("tai khoan").map((section) => section.id),
    ).toEqual(["settings-payments"]);
    expect(
      searchSettingsSections("email").map((section) => section.id),
    ).toEqual(["settings-contact"]);
    expect(searchSettingsSections("ZALO").map((section) => section.id)).toEqual(
      ["settings-social"],
    );
    expect(searchSettingsSections("")).toHaveLength(4);
    expect(searchSettingsSections("does-not-exist")).toEqual([]);
  });
});

it("permits removing a required product image with a real neutral public placeholder", () => {
  const value = "/images/product-placeholder.svg";
  expect(productSchema.shape.image_url.parse(value)).toBe(value);
  const svg = readFileSync(
    new URL("../public/images/product-placeholder.svg", import.meta.url),
    "utf8",
  );
  expect(svg).toContain('viewBox="0 0 800 800"');
  expect(svg).toContain("Chưa có ảnh sản phẩm");
});
