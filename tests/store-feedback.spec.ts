import { test, expect } from "@playwright/test";

test("header search opens an input and searches products and journal content", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Mộc Bàm");
  await expect(
    page.getByText("NHỎ XINH TỪ GỖ · TỈ MỈ TỪ TÂM", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tìm kiếm sản phẩm và bài viết" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Tìm một điều nhỏ xinh" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox", { name: "Từ khóa tìm kiếm" }).fill("go");
  await dialog.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page).toHaveURL(/tim-kiem\?q=go/);
  await expect(
    page.getByRole("heading", { name: /^Sản phẩm \(/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /^Nhật ký Mộc Bàm \(/ }),
  ).toBeVisible();
});

test("home categories precede products and its carousel browses beyond the first four", async ({
  page,
}) => {
  await page.goto("/");
  const category = page.getByRole("heading", {
    name: "Dòng nhân vật",
    exact: true,
  });
  const products = page.getByRole("heading", {
    name: "Nhỏ xinh, đủ thương.",
    exact: true,
  });
  expect(
    await category.evaluate((element) => element.getBoundingClientRect().top),
  ).toBeLessThan(
    await products.evaluate((element) => element.getBoundingClientRect().top),
  );
  const carousel = page.getByRole("region", {
    name: "Sản phẩm Mộc Bàm",
    exact: true,
  });
  await expect(carousel.locator("article")).toHaveCount(8);
  await carousel
    .getByRole("button", { name: "Sản phẩm Mộc Bàm: xem tiếp" })
    .click();
  await expect(
    carousel.getByRole("button", { name: "Sản phẩm Mộc Bàm: xem trước" }),
  ).toBeEnabled();
});

test("journal date filter hides out-of-range posts and article opens from its card", async ({
  page,
}) => {
  await page.goto("/blog");
  await page.getByLabel("Từ ngày", { exact: true }).fill("2026-10-04");
  await expect(
    page.getByText("Chưa có bài viết trong khoảng ngày này.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc ngày" }).click();
  await page.getByRole("link", { name: /Từ một mảnh gỗ nhỏ/ }).click();
  await expect(
    page.getByRole("heading", { name: "Từ một mảnh gỗ nhỏ", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Về Nhật ký/ })).toHaveCount(0);
  await expect(page.getByText("Đọc câu chuyện", { exact: true })).toHaveCount(
    0,
  );
});

test("journal waits for client handlers before accepting the first date filter", async ({
  page,
}) => {
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>((resolve) => {
    releaseScripts = resolve;
  });
  await page.route("**/_next/static/**", async (route) => {
    if (route.request().resourceType() === "script") await scriptsReady;
    await route.continue();
  });
  await page.goto("/blog", { waitUntil: "commit" });
  const from = page.getByLabel("Từ ngày", { exact: true });
  try {
    await expect(from).toBeDisabled();
    await expect(page.getByLabel("Đến ngày", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Sắp xếp", { exact: true })).toBeDisabled();
  } finally {
    releaseScripts();
  }
  await expect(from).toBeEnabled();
  await from.fill("2026-10-04");
  await expect(
    page.getByText("Chưa có bài viết trong khoảng ngày này.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xóa bộ lọc ngày" }),
  ).toBeVisible();
});

test("policy dropdown opens only the selected policy and card buy-now reaches checkout", async ({
  page,
}) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await navigation
    .getByRole("button", { name: "Chính sách", exact: true })
    .click();
  await navigation
    .getByRole("link", { name: "Đổi trả & chăm sóc", exact: true })
    .click();
  await expect(page).toHaveURL(/muc=doi-tra/);
  await expect(
    page.getByRole("heading", { name: "Đổi trả & chăm sóc", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Giao hàng", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("đồ án", { exact: false })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Mục lục chính sách" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Xem tất cả chính sách" }),
  ).toHaveCount(0);
  await page.goto("/san-pham");
  await page
    .getByRole("button", { name: "Mua ngay Mèo Mộc", exact: true })
    .click();
  await expect(page).toHaveURL(/thanh-toan/);
  await expect(
    page.getByText("Mèo Mộc", { exact: true }).first(),
  ).toBeVisible();
});

test("home navigation and hover policy dropdown remain accessible", async ({
  page,
}) => {
  await page.goto("/blog");
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await navigation
    .getByRole("link", { name: "Trang chủ", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("link", { name: "Mộc Bàm - Trang chủ" }),
  ).toContainText("MỘC BÀM");
  const trigger = navigation.getByRole("button", {
    name: "Chính sách",
    exact: true,
  });
  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await navigation
    .getByRole("link", { name: "Giao hàng", exact: true })
    .hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("heading", { level: 1 }).hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("mobile search remains reachable and its dialog closes with Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Tìm kiếm sản phẩm và bài viết" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Tìm một điều nhỏ xinh" });
  await expect(dialog).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
