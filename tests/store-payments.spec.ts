import { test, expect } from "@playwright/test";
import type { BankTransfer, Order } from "../src/lib/types";

const order: Order = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  reference: "MB-100",
  user_id: null,
  customer_name: "Khách kiểm tra",
  email: "fixture@example.test",
  phone: "0900000000",
  address: "Địa chỉ kiểm tra",
  city: "Thành phố kiểm tra",
  note: "",
  subtotal: 99000,
  shipping_fee: 0,
  total: 99000,
  status: "pending",
  payment_method: "bank_transfer",
  payment_status: "awaiting_payment",
  paid_at: null,
  refunded_at: null,
  payment_bank_bin: "970000",
  payment_bank_name: "Ngân hàng kiểm tra",
  payment_bank_account_number: "00000001",
  payment_bank_account_name: "TAI KHOAN KIEM TRA",
  created_at: "2026-10-03T01:00:00Z",
  items: [
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      product_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      name: "Sản phẩm kiểm tra",
      price: 99000,
      quantity: 1,
    },
  ],
};

// Browser-only image fixture; no real receiving account or remotely generated QR.
const transfer: BankTransfer = {
  bankName: order.payment_bank_name,
  accountNumber: order.payment_bank_account_number,
  accountName: order.payment_bank_account_name,
  amount: order.total,
  reference: "MB100",
  qrDataUrl: `data:image/svg+xml;base64,${Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="224" height="224"><rect width="224" height="224" fill="white"/><path d="M20 20h60v60H20zM144 20h60v60h-60zM20 144h60v60H20z" fill="#29412d"/></svg>',
  ).toString("base64")}`,
};

test("checkout defaults to COD and explains deferred bank transfer", async ({
  page,
}) => {
  await page.goto("/san-pham");
  await page
    .getByRole("button", { name: "Thêm Mèo Mộc vào giỏ hàng", exact: true })
    .click();
  await page.goto("/thanh-toan");
  await expect(
    page.getByRole("radio", { name: /Thanh toán khi nhận hàng/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: /Chuyển khoản ngân hàng/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "Chuyển khoản sẽ được mở khi cửa hàng cập nhật tài khoản nhận tiền.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("bank receipt shows exact instructions and removes QR after payment confirmation", async ({
  page,
}) => {
  let current: Order = { ...order };
  await page.route(`**/api/orders/${order.id}?*`, (route) =>
    route.fulfill({ json: { order: current, transfer } }),
  );
  await page.goto(`/don-hang/${order.id}?token=browser-fixture`);
  await expect(
    page.getByText(transfer.accountNumber, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(transfer.accountName, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(transfer.reference, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: `Mã QR chuyển khoản cho đơn ${order.reference}`,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Chuyển khoản không tự đổi trạng thái", { exact: false }),
  ).toBeVisible();

  current = {
    ...order,
    payment_status: "paid",
    paid_at: "2026-10-03T02:00:00Z",
  };
  await page.getByRole("button", { name: "Cập nhật trạng thái" }).click();
  await expect(
    page.getByRole("heading", { name: "Mộc đã xác nhận thanh toán." }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Mã QR chuyển khoản/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText(transfer.accountNumber, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Bạn không cần thanh toán lại", { exact: false }),
  ).toBeVisible();
});

for (const state of [
  "cancelled-unpaid",
  "cancelled-paid",
  "refunded",
] as const) {
  test(`receipt ${state} hides payment instructions and gives correct next step`, async ({
    page,
  }) => {
    const current: Order = {
      ...order,
      status: "cancelled",
      payment_status:
        state === "cancelled-unpaid"
          ? "awaiting_payment"
          : state === "refunded"
            ? "refunded"
            : "paid",
      paid_at: state === "cancelled-unpaid" ? null : "2026-10-03T02:00:00Z",
      refunded_at: state === "refunded" ? "2026-10-03T03:00:00Z" : null,
    };
    await page.route(`**/api/orders/${order.id}?*`, (route) =>
      route.fulfill({ json: { order: current, transfer } }),
    );
    await page.goto(`/don-hang/${order.id}?token=browser-fixture`);
    await expect(
      page.getByRole("heading", { name: "Đơn hàng đã được hủy." }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Mã QR chuyển khoản/ }),
    ).toHaveCount(0);
    await expect(
      page.getByText(transfer.accountNumber, { exact: true }),
    ).toHaveCount(0);
    if (state === "cancelled-paid") {
      await expect(
        page.getByText("Cửa hàng cần xử lý hoàn tiền thủ công", {
          exact: false,
        }),
      ).toBeVisible();
    } else if (state === "refunded") {
      await expect(
        page.getByText("Mộc đã xác nhận hoàn tiền vào", { exact: false }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("Vui lòng không chuyển tiền", { exact: false }),
      ).toBeVisible();
    }
  });
}

test("COD receipt explains payment on delivery without bank instructions", async ({
  page,
}) => {
  await page.route(`**/api/orders/${order.id}?*`, (route) =>
    route.fulfill({
      json: { order: { ...order, payment_method: "cod" }, transfer: null },
    }),
  );
  await page.goto(`/don-hang/${order.id}?token=browser-fixture`);
  await expect(
    page.getByText("cho nhân viên giao hàng khi nhận được đơn", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Mã QR chuyển khoản/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Nội dung chuyển khoản", { exact: true }),
  ).toHaveCount(0);
});

for (const method of ["cod", "bank_transfer", "unconfigured"] as const) {
  test(`zero-total ${method} receipt requires no money or bank instructions`, async ({
    page,
  }) => {
    await page.route(`**/api/orders/${order.id}?*`, (route) =>
      route.fulfill({
        json: {
          order: {
            ...order,
            payment_method: method,
            subtotal: 0,
            total: 0,
            payment_bank_bin:
              method === "bank_transfer" ? order.payment_bank_bin : "",
            payment_bank_name:
              method === "bank_transfer" ? order.payment_bank_name : "",
            payment_bank_account_number:
              method === "bank_transfer"
                ? order.payment_bank_account_number
                : "",
            payment_bank_account_name:
              method === "bank_transfer" ? order.payment_bank_account_name : "",
          },
          transfer: null,
        },
      }),
    );
    await page.goto(`/don-hang/${order.id}?token=browser-fixture`);
    await expect(
      page.getByText("Bạn không cần thanh toán hoặc chuyển khoản", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Mã QR chuyển khoản/ }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Nội dung chuyển khoản", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("cho nhân viên giao hàng khi nhận được đơn", {
        exact: false,
      }),
    ).toHaveCount(0);
  });
}
