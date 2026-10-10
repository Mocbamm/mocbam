import nodemailer from "nodemailer";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createVoucherMailer,
  voucherDeliveryFailure,
  voucherEmailConfigured,
} from "@/lib/email-server";
import {
  personalizeVoucherEmail,
  voucherEmailFooter,
  voucherEmailSchema,
} from "@/lib/voucher-email";
import type { Discount } from "@/lib/types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("voucher message and SMTP transport", () => {
  it("requires a separate server SMTP configuration and never claims auth SMTP is usable", () => {
    for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"])
      vi.stubEnv(key, "");
    expect(voucherEmailConfigured()).toBe(false);
    expect(() => createVoucherMailer()).toThrow(
      "Chưa kết nối dịch vụ gửi email",
    );
  });

  it("passes a separate recipient, TLS, bounded timeouts and deterministic message ID to SMTP", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.invalid");
    vi.stubEnv("SMTP_PORT", "465");
    vi.stubEnv("SMTP_USER", "sender");
    vi.stubEnv("SMTP_PASSWORD", "synthetic-test-password");
    vi.stubEnv("SMTP_FROM", "shop@example.invalid");
    const sendMail = vi
      .fn()
      .mockResolvedValue({ accepted: ["buyer@example.invalid"] });
    const close = vi.fn();
    const create = vi
      .spyOn(nodemailer, "createTransport")
      .mockReturnValue({ sendMail, close } as unknown as ReturnType<
        typeof nodemailer.createTransport
      >);
    const mailer = createVoucherMailer();
    await mailer.send({
      to: "buyer@example.invalid",
      subject: "Ưu đãi",
      text: "Xin chào",
      deliveryId: "delivery-1",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        secure: true,
        disableFileAccess: true,
        disableUrlAccess: true,
        connectionTimeout: 5000,
        socketTimeout: 15000,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { address: "buyer@example.invalid", name: "" },
        messageId: "<voucher-delivery-1@example.invalid>",
        subject: "Ưu đãi",
        text: "Xin chào",
      }),
    );
    expect(sendMail.mock.calls[0][0]).not.toHaveProperty("bcc");
    mailer.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it("requires STARTTLS on non-465 SMTP and treats unaccepted recipients as failures", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.example.invalid");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_USER", "sender");
    vi.stubEnv("SMTP_PASSWORD", "synthetic-test-password");
    vi.stubEnv("SMTP_FROM", "shop@example.invalid");
    const create = vi
      .spyOn(nodemailer, "createTransport")
      .mockReturnValue({
        sendMail: vi.fn().mockResolvedValue({ accepted: [] }),
        close: vi.fn(),
      } as unknown as ReturnType<typeof nodemailer.createTransport>);
    const mailer = createVoucherMailer();
    await expect(
      mailer.send({
        to: "buyer@example.invalid",
        subject: "Ưu đãi",
        text: "Xin chào",
        deliveryId: "one",
      }),
    ).rejects.toMatchObject({ responseCode: 550 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false, requireTLS: true }),
    );
  });

  it("validates header boundaries, recipient identity, unique recipients and batch bounds", () => {
    const base = {
      idempotency_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      recipient_user_ids: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
      subject: "Mộc",
      body: "Chào bạn",
    };
    expect(voucherEmailSchema.safeParse(base).success).toBe(true);
    for (const input of [
      { ...base, subject: "Mộc\r\nBcc: victim@example.invalid" },
      {
        ...base,
        recipient_user_ids: [
          ...base.recipient_user_ids,
          ...base.recipient_user_ids,
        ],
      },
      { ...base, to: "someone@example.invalid" },
      { ...base, recipient_user_ids: [] },
      { ...base, body: "\u0000" },
    ])
      expect(voucherEmailSchema.safeParse(input).success).toBe(false);
  });

  it("personalizes plain text and always includes the actual voucher terms in the footer", () => {
    expect(
      personalizeVoucherEmail("Chào {ten_khach}, tài khoản {email}", {
        recipient_name: "Mộc <b>",
        recipient_email: "buyer@example.invalid",
      }),
    ).toBe("Chào Mộc <b>, tài khoản buyer@example.invalid");
    const footer = voucherEmailFooter(
      {
        code: "PRIVATE7",
        kind: "fixed",
        value: 7000,
        min_subtotal: 100000,
        max_discount: 7000,
        starts_at: null,
        ends_at: null,
      } as Discount,
      "https://mocbam.vercel.app",
    );
    expect(footer).toContain("PRIVATE7");
    expect(footer).toContain("7.000");
    expect(footer).toContain("100.000");
    expect(footer).toContain("https://mocbam.vercel.app");
  });

  it("distinguishes definite rejection from ambiguous delivery and suppresses provider secrets", () => {
    expect(
      voucherDeliveryFailure({ responseCode: 550, message: "secret-token" }),
    ).toMatchObject({ status: "failed" });
    expect(
      voucherDeliveryFailure({ code: "ETIMEDOUT", message: "secret-token" }),
    ).toMatchObject({ status: "unknown" });
    expect(
      JSON.stringify(voucherDeliveryFailure(new Error("secret-token"))),
    ).not.toContain("secret-token");
  });
});
