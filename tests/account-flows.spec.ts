import { expect, test } from "@playwright/test";

test("checkout selects province and wards and provides manual fallback", async ({
  page,
}) => {
  await page.goto("/san-pham");
  await page
    .getByRole("button", { name: "Thêm Mèo Mộc vào giỏ hàng", exact: true })
    .click();
  await page.goto("/thanh-toan");
  const city = page.getByLabel("Tỉnh / thành phố *", { exact: true });
  const ward = page.getByLabel("Phường / xã *", { exact: true });
  await expect(ward).toBeDisabled();
  await city.selectOption({ label: "Thành phố Hồ Chí Minh" });
  await expect(ward).toBeEnabled();
  await ward.selectOption({ index: 1 });
  await city.selectOption({ label: "Thành phố Hà Nội" });
  await expect(ward).toHaveValue("");
  await page.getByRole("button", { name: "Nhập địa chỉ thủ công" }).click();
  await city.fill("Địa chỉ ngoài danh sách");
  await ward.fill("Phường theo địa chỉ nhận hàng");
  await expect(city).toHaveValue("Địa chỉ ngoài danh sách");
});

test("chat requires an account and gives guests a direct contact alternative", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Trò chuyện với Mộc", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Trò chuyện với Mộc Bàm" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Đăng nhập để trò chuyện" }),
  ).toHaveAttribute("href", "/tai-khoan");
  await expect(page.getByLabel("Câu hỏi của bạn")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "gửi lời nhắn qua trang Liên hệ" }),
  ).toHaveAttribute("href", "/lien-he");
  const response = await request.get("/api/account/support");
  expect(response.status()).toBe(401);
  expect(await response.json()).not.toHaveProperty("messages");
});

test("registration requests name and phone alongside email and password", async ({
  page,
}) => {
  await page.goto("/tai-khoan");
  await page.getByRole("button", { name: "Đăng ký", exact: true }).click();
  for (const label of ["Họ và tên", "Số điện thoại", "Email", "Mật khẩu"]) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(
    page.getByRole("button", { name: "Tạo tài khoản", exact: true }),
  ).toBeDisabled();
});

test("guest receipt is rediscovered on the account page with current progress", async ({
  page,
}) => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const token = "A".repeat(43);
  await page.route(`**/api/orders/${id}?*`, (route) =>
    route.fulfill({
      json: {
        order: {
          id,
          reference: "MB-100",
          user_id: null,
          customer_name: "Khách kiểm tra",
          email: "test@example.invalid",
          phone: "0900000000",
          address: "Đường kiểm tra",
          city: "Thành phố kiểm tra",
          note: "",
          subtotal: 99000,
          shipping_fee: 0,
          total: 99000,
          status: "shipped",
          payment_method: "cod",
          payment_status: "awaiting_payment",
          paid_at: null,
          refunded_at: null,
          payment_bank_bin: "",
          payment_bank_name: "",
          payment_bank_account_number: "",
          payment_bank_account_name: "",
          created_at: "2026-10-05T01:00:00Z",
          items: [],
        },
        transfer: null,
      },
    }),
  );
  await page.goto(`/don-hang/${id}?token=${token}`);
  await expect(
    page.getByText("Trạng thái xử lý:", { exact: false }),
  ).toBeVisible();
  await page
    .locator("#main-content")
    .getByRole("link", { name: "Đơn hàng của tôi", exact: true })
    .click();
  await expect(page.getByText("MB-100", { exact: false }).last()).toBeVisible();
  await page.getByText("MB-100", { exact: false }).last().click();
  await expect(page.locator('[aria-current="step"]')).toContainText(
    "Đang giao",
  );
});
