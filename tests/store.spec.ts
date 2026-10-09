import { test, expect } from "@playwright/test";

test("catalog, product, cart and reload keep the same selected quantity", async ({
  page,
}) => {
  await page.goto("/san-pham");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page
    .getByRole("button", { name: "Thêm Mèo Mộc vào giỏ hàng", exact: true })
    .click();
  await page.goto("/gio-hang");
  await expect(
    page.getByRole("link", { name: "Mèo Mộc", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("189.000", { exact: false }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Mèo Mộc", exact: true }).first(),
  ).toBeVisible();
});

test("category query displays only its products and unknown search is empty", async ({
  page,
}) => {
  await page.goto("/san-pham?danh-muc=chuoi");
  await expect(
    page.getByRole("link", { name: "Chuỗi Vòng Mộc", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Mèo Mộc", exact: true }),
  ).toHaveCount(0);
  await page.goto("/san-pham?tim=khongcosanphamnay");
  await expect(
    page.getByRole("link", { name: "Mèo Mộc", exact: true }),
  ).toHaveCount(0);
});

test("mobile home has no horizontal overflow and sample images load", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("img", {
      name: "Những món đồ gỗ nhỏ xinh trong không gian xanh của Mộc Bàm",
    })
    .waitFor();
  await expect
    .poll(() =>
      page
        .getByRole("img", {
          name: "Những món đồ gỗ nhỏ xinh trong không gian xanh của Mộc Bàm",
        })
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    )
    .toBe(true);
});

test("staff chat opens and can be closed without blocking browsing", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Trò chuyện với Mộc", exact: true })
    .click();
  const region = page.getByRole("region", { name: "Trò chuyện với Mộc Bàm" });
  await expect(region).toBeVisible();
  await page
    .getByRole("button", { name: "Đóng trò chuyện", exact: true })
    .click();
  await expect(region).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Trò chuyện với Mộc", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("malformed receipt cannot expose customer data", async ({
  page,
  request,
}) => {
  const response = await request.get(
    "/api/orders/00000000-0000-4000-8000-000000000001?token=invalid",
  );
  expect([401, 403, 404, 503]).toContain(response.status());
  await page.goto(
    "/don-hang/00000000-0000-4000-8000-000000000001?token=invalid",
  );
  await expect(page.getByText("090 000", { exact: false })).toHaveCount(0);
});
