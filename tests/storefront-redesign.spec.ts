import { test, expect } from "@playwright/test";

test("cart drawer shares quantities, totals and persistence with the header cart", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Giỏ hàng, 0 sản phẩm", exact: true })
    .click();
  const drawer = page.getByRole("dialog", { name: /^Giỏ hàng/ });
  await expect(
    drawer.getByRole("heading", {
      name: "Giỏ hàng đang chờ bạn.",
      exact: true,
    }),
  ).toBeVisible();
  await drawer
    .getByRole("link", { name: "Khám phá sản phẩm", exact: true })
    .click();
  await expect(page).toHaveURL(/\/san-pham$/);
  await expect(drawer).not.toBeVisible();

  // “Bỏ giỏ” opens the drawer by itself (owner feedback 11/10).
  await page
    .getByRole("button", { name: "Thêm Mèo Mộc vào giỏ hàng", exact: true })
    .click();
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: "Mèo Mộc", exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByLabel("Số lượng Mèo Mộc", { exact: true }),
  ).toHaveText("1");
  const subtotal = drawer.getByText("Tạm tính", { exact: true }).locator("..");
  await expect(subtotal).toContainText("189.000");

  await drawer
    .getByRole("button", { name: "Tăng số lượng Mèo Mộc", exact: true })
    .click();
  await expect(
    drawer.getByLabel("Số lượng Mèo Mộc", { exact: true }),
  ).toHaveText("2");
  await expect(
    drawer.getByRole("heading", { name: "Giỏ hàng (2)", exact: true }),
  ).toBeVisible();
  await expect(subtotal).toContainText("378.000");
  await drawer
    .getByRole("button", { name: "Đóng giỏ hàng", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Giỏ hàng, 2 sản phẩm", exact: true }),
  ).toBeVisible();

  await page.reload();
  await page
    .getByRole("button", { name: "Giỏ hàng, 2 sản phẩm", exact: true })
    .click();
  await expect(
    drawer.getByLabel("Số lượng Mèo Mộc", { exact: true }),
  ).toHaveText("2");
  await expect(subtotal).toContainText("378.000");
  await drawer
    .getByRole("button", { name: "Xóa Mèo Mộc", exact: true })
    .click();
  await expect(
    drawer.getByRole("heading", {
      name: "Giỏ hàng đang chờ bạn.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: "Mèo Mộc", exact: true }),
  ).toHaveCount(0);
  await drawer
    .getByRole("button", { name: "Đóng giỏ hàng", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Giỏ hàng, 0 sản phẩm", exact: true }),
  ).toBeVisible();
});

test("mobile menu supports keyboard dismissal and route navigation at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Mở menu", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("dialog", { name: "MỘC BÀM", exact: true });
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Enter");
  await menu
    .getByRole("navigation", { name: "Menu di động", exact: true })
    .getByRole("link", { name: "Sản phẩm", exact: true })
    .click();
  await expect(page).toHaveURL(/\/san-pham$/);
  await expect(menu).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("mobile catalog applies draft filters and resets to the complete catalog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto("/san-pham");
  const products = page.getByRole("region", {
    name: "Danh sách sản phẩm",
    exact: true,
  });
  await expect(
    products.getByRole("link", { name: "Mèo Mộc", exact: true }),
  ).toBeVisible();
  await products.getByRole("button", { name: /^Bộ lọc/ }).click();
  const filters = page.getByRole("dialog", {
    name: "Bộ lọc sản phẩm",
    exact: true,
  });
  await filters.getByLabel("Danh mục", { exact: true }).selectOption("chuoi");
  await page.keyboard.press("Escape");
  await expect(filters).not.toBeVisible();
  await expect(
    products.getByRole("button", { name: "Tất cả", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    products.getByRole("link", { name: "Mèo Mộc", exact: true }),
  ).toBeVisible();
  await products.getByRole("button", { name: /^Bộ lọc/ }).click();
  await expect(filters.getByLabel("Danh mục", { exact: true })).toHaveValue("");
  await filters.getByLabel("Danh mục", { exact: true }).selectOption("chuoi");
  await filters.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(filters).not.toBeVisible();
  await expect(
    products.getByRole("heading", { name: "Chuỗi & phụ kiện", exact: true }),
  ).toBeVisible();
  await expect(
    products.getByRole("button", { name: "Chuỗi & phụ kiện", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    products.getByRole("link", { name: "Chuỗi Vòng Mộc", exact: true }),
  ).toBeVisible();
  await expect(
    products.getByRole("link", { name: "Mèo Mộc", exact: true }),
  ).toHaveCount(0);

  await products.getByRole("button", { name: /^Bộ lọc/ }).click();
  await filters.getByRole("button", { name: "Đặt lại", exact: true }).click();
  await filters.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect(
    products.getByRole("button", { name: "Tất cả", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    products.getByRole("link", { name: "Mèo Mộc", exact: true }),
  ).toBeVisible();
  await expect(
    products.getByRole("link", { name: "Chuỗi Vòng Mộc", exact: true }),
  ).toBeVisible();
  await expect(products.getByText("8 sản phẩm", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
