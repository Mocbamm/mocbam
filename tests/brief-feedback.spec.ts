import { test, expect } from "@playwright/test";

// Owner brief, 06/11: menus, footer, product pages and policy names.
test("policy menu lists the brief's policies in order without extras", async ({
  page,
}) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await navigation
    .getByRole("button", { name: "Chính sách", exact: true })
    .click();
  const menu = page.locator("#desktop-policy-links");
  await expect(menu.getByRole("link")).toHaveText([
    "Hướng dẫn mua hàng",
    "Chính sách giao hàng",
    "Phương thức thanh toán",
    "Chính sách đổi trả và hỗ trợ sau mua",
    "Quyền riêng tư",
    "Điều khoản sử dụng",
    "Liên hệ",
  ]);
  await expect(menu.getByText("Cần Mộc giúp một chút?")).toHaveCount(0);
  await expect(menu.getByText("Cùng Mộc an tâm mua sắm")).toHaveCount(0);
});

test("old warranty links open the contact policy", async ({ page }) => {
  await page.goto("/chinh-sach?muc=bao-hanh");
  await expect(
    page.getByRole("heading", { name: "LIÊN HỆ", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Để chúng mình hiểu nhau hơn")).toHaveCount(0);
});

test("footer groups products, lists policies and links social accounts", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("img", { name: "Logo Mộc Bàm" })).toBeVisible();
  await expect(footer.getByText("Từ gỗ, với thương yêu")).toHaveCount(0);
  await expect(footer.getByText("Gửi Mộc lời nhắn")).toHaveCount(0);
  const beads = footer.getByRole("link", { name: "Chuỗi", exact: true });
  await expect(beads).toBeHidden();
  await footer.getByRole("link", { name: "Sản phẩm", exact: true }).hover();
  await expect(beads).toBeVisible();
  await expect(
    footer.getByRole("link", { name: "Búp bê", exact: true }),
  ).toBeVisible();
  await expect(
    footer.getByRole("link", { name: "Liên hệ", exact: true }),
  ).toBeVisible();
  const social = footer.getByRole("list", { name: "Kết nối với Mộc Bàm" });
  await expect(
    social.getByRole("link", { name: "Threads", exact: true }),
  ).toHaveAttribute("href", "https://www.threads.com/@mocbamm");
  await expect(social.getByRole("link", { name: /^Gmail/ })).toHaveAttribute(
    "href",
    /^mailto:/,
  );
  await expect(
    page
      .locator(".store-home-contact")
      .getByText("Có điều muốn tâm sự?", { exact: true }),
  ).toBeVisible();
});

test("product pages drop the banner and the shipping accordions", async ({
  page,
}) => {
  await page.goto("/san-pham");
  await expect(page.getByText("Gom một chút niềm vui")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Búp bê", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Mèo Mộc", exact: true })
    .first()
    .click();
  await expect(page.getByText("Giao hàng & thanh toán")).toHaveCount(0);
  const description = page.locator(
    ".store-product-detail-grid > .store-product-description",
  );
  const gallery = page.locator(".store-product-gallery");
  const [descriptionBox, galleryBox] = await Promise.all([
    description.boundingBox(),
    gallery.boundingBox(),
  ]);
  // Under the photos, in the same column.
  expect(descriptionBox!.y).toBeGreaterThan(galleryBox!.y + galleryBox!.height);
  expect(Math.abs(descriptionBox!.x - galleryBox!.x)).toBeLessThan(2);
});

test("about invitation shows a heading with a smaller sentence", async ({
  page,
}) => {
  await page.goto("/chung-toi");
  await expect(page.getByText("Câu chuyện của chúng mình")).toHaveCount(0);
  await expect(
    page.getByText("Một góc xinh, một câu chuyện của riêng bạn", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Chia sẻ cùng Mộc Bàm" }),
  ).toBeVisible();
});

test("header Sản phẩm reveals the product lines on hover and still opens all products", async ({
  page,
}) => {
  await page.goto("/blog");
  const navigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  const beads = navigation.getByRole("link", { name: "Chuỗi", exact: true });
  await expect(beads).toBeHidden();
  const products = navigation.getByRole("link", {
    name: "Sản phẩm",
    exact: true,
  });
  await products.hover();
  await expect(beads).toBeVisible();
  await navigation.getByRole("link", { name: "Búp bê", exact: true }).click();
  await expect(page).toHaveURL(/danh-muc=nhan-vat/);
  await page.mouse.move(640, 700);
  await expect(beads).toBeHidden();
  await products.click();
  await expect(page).toHaveURL(/\/san-pham$/);
  // Keyboard users reach the lines with Tab.
  await products.focus();
  await page.keyboard.press("Tab");
  await expect(beads).toBeFocused();
  await expect(beads).toBeVisible();
});
