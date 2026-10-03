import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { demoSettings, demoProducts } from "@/lib/demo-data";
import { isBankTransferAvailable, transferReference } from "@/lib/payments";
import { buildVietQrPayload, qrChecksum } from "@/lib/vietqr";
import { bankTransferInstructions } from "@/lib/bank-transfer";
import {
  canonicalOrderPayload,
  manualPaymentSchema,
  orderSchema,
  settingsSchema,
} from "@/lib/validation";
import type { Order } from "@/lib/types";

const input = {
  items: [{ product_id: demoProducts[0].id, quantity: 1 }],
  customer: {
    name: "Khách kiểm thử",
    email: "test@example.invalid",
    phone: "0900000000",
    address: "Không giao hàng",
    city: "Kiểm thử",
    note: "",
  },
  idempotency_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
};
const bank = {
  bank_transfer_enabled: true,
  bank_bin: "970415",
  bank_name: "VietinBank",
  bank_account_number: "1234567890",
  bank_account_name: "TAI KHOAN KIEM THU",
};
const order: Order = {
  id: input.idempotency_key,
  reference: "MB-42",
  user_id: null,
  customer_name: input.customer.name,
  email: input.customer.email,
  phone: input.customer.phone,
  address: input.customer.address,
  city: input.customer.city,
  note: "",
  subtotal: 99000,
  shipping_fee: 15000,
  total: 114000,
  status: "pending",
  payment_method: "bank_transfer",
  payment_status: "awaiting_payment",
  paid_at: null,
  refunded_at: null,
  payment_bank_bin: bank.bank_bin,
  payment_bank_name: bank.bank_name,
  payment_bank_account_number: bank.bank_account_number,
  payment_bank_account_name: bank.bank_account_name,
  created_at: "2026-10-03T00:00:00Z",
  items: [],
};
function fields(payload: string): Record<string, string> {
  const result: Record<string, string> = {};
  let at = 0;
  while (at < payload.length) {
    const id = payload.slice(at, at + 2);
    const size = Number(payload.slice(at + 2, at + 4));
    result[id] = payload.slice(at + 4, at + 4 + size);
    at += 4 + size;
  }
  expect(at).toBe(payload.length);
  return result;
}

describe("manual payment boundaries", () => {
  it("defaults legacy requests to COD and rejects customer-supplied payment state", () => {
    expect(orderSchema.parse(input).payment_method).toBe("cod");
    expect(
      orderSchema.safeParse({ ...input, payment_method: "bank_transfer" })
        .success,
    ).toBe(true);
    for (const patch of [
      { payment_method: "paid" },
      { payment_method: "unconfigured" },
      { payment_status: "paid" },
      { paid_at: "2026-01-01" },
    ])
      expect(orderSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it("treats payment method changes as a different checkout request", () => {
    const cod = orderSchema.parse(input);
    const transfer = orderSchema.parse({
      ...input,
      payment_method: "bank_transfer",
    });
    expect(canonicalOrderPayload(cod, null)).not.toBe(
      canonicalOrderPayload(transfer, null),
    );
  });
  it("requires complete valid bank details to enable transfer; old settings updates do not clear bank configuration", () => {
    expect(settingsSchema.safeParse({ ...demoSettings, ...bank }).success).toBe(
      true,
    );
    expect(isBankTransferAvailable({ ...demoSettings, ...bank })).toBe(true);
    expect(isBankTransferAvailable(demoSettings)).toBe(false);
    for (const patch of [
      { bank_bin: "" },
      { bank_bin: "970415oops" },
      { bank_account_number: "1234" },
      { bank_account_number: "123456<script>" },
      { bank_name: " " },
      { bank_account_name: " " },
    ]) {
      expect(
        settingsSchema.safeParse({ ...demoSettings, ...bank, ...patch })
          .success,
      ).toBe(false);
      expect(
        isBankTransferAvailable({ ...demoSettings, ...bank, ...patch }),
      ).toBe(false);
    }
    const {
      bank_transfer_enabled: _enabled,
      bank_bin: _bin,
      bank_name: _name,
      bank_account_number: _number,
      bank_account_name: _holder,
      ...legacy
    } = demoSettings;
    void [_enabled, _bin, _name, _number, _holder];
    expect(settingsSchema.parse(legacy)).not.toHaveProperty(
      "bank_transfer_enabled",
    );
  });
  it("requires a confirmation record without permitting price, method or owner changes", () => {
    expect(
      manualPaymentSchema.parse({ action: "paid", note: " cash received " })
        .note,
    ).toBe("cash received");
    for (const patch of [
      { action: "awaiting_payment", note: "change" },
      { action: "paid", note: " " },
      { action: "paid", note: "x".repeat(201) },
      { action: "paid", note: "cash", amount: 1 },
    ])
      expect(manualPaymentSchema.safeParse(patch).success).toBe(false);
  });
});

describe("locally generated transfer QR", () => {
  it("matches the published VietQR CRC example", () => {
    // Public protocol example: api.vietqr.vn/vi/api-vietqr-callback/goi-api-generate-vietqr-code
    const example =
      "00020101021238570010A000000727012700069704220113VQRQACYEK56060208QRIBFTTA5303704540468685802VN62300107NPS68690815Test VA Account6304BE01";
    expect(qrChecksum(example.slice(0, -4))).toBe(example.slice(-4));
  });
  it("encodes the exact recipient, server total including shipping, VND and unambiguous order memo", async () => {
    const transfer = await bankTransferInstructions(order);
    expect(transfer).toMatchObject({
      bankName: bank.bank_name,
      accountNumber: bank.bank_account_number,
      accountName: bank.bank_account_name,
      amount: 114000,
      reference: "MB42",
    });
    const png = PNG.sync.read(
      Buffer.from(transfer!.qrDataUrl.split(",")[1], "base64"),
    );
    const decoded = jsQR(
      new Uint8ClampedArray(png.data),
      png.width,
      png.height,
    );
    expect(decoded).not.toBeNull();
    const qr = fields(decoded!.data);
    expect(qr["53"]).toBe("704");
    expect(qr["54"]).toBe("114000");
    expect(qr["58"]).toBe("VN");
    expect(fields(qr["62"])["08"]).toBe("MB42");
    const account = fields(qr["38"]);
    expect(account["00"]).toBe("A000000727");
    expect(account["02"]).toBe("QRIBFTTA");
    expect(fields(account["01"])).toEqual({
      "00": "970415",
      "01": "1234567890",
    });
    expect(decoded!.data).not.toContain(input.customer.email);
  });
  it("does not offer a payable QR for cash, legacy, paid, refunded, cancelled or zero-value orders", async () => {
    for (const patch of [
      { payment_method: "cod" },
      { payment_method: "unconfigured" },
      { payment_status: "paid" },
      { payment_status: "refunded" },
      { status: "cancelled" },
      { total: 0 },
    ])
      expect(
        await bankTransferInstructions({ ...order, ...patch } as Order),
      ).toBeNull();
  });
  it("rejects invalid receiving fields, fractional/negative money and arbitrary transfer references", () => {
    expect(transferReference("MB-42")).toBe("MB42");
    expect(() => transferReference("https://example.invalid")).toThrow();
    const details = {
      bankBin: "970415",
      accountNumber: "1234567890",
      amount: 114000,
      reference: "MB42",
    };
    for (const patch of [
      { bankBin: "abcd" },
      { accountNumber: "1234" },
      { amount: 0 },
      { amount: -1 },
      { amount: 1.5 },
      { reference: "MB42<script>" },
    ])
      expect(() => buildVietQrPayload({ ...details, ...patch })).toThrow();
  });
});
