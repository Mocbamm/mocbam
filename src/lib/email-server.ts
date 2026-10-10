import nodemailer from "nodemailer";
import { z } from "zod";
import { HttpError } from "@/lib/http";

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM?.trim();
  const port = Number(process.env.SMTP_PORT || "465");
  const secureSetting = process.env.SMTP_SECURE;
  if (
    !host ||
    /[\s/]/.test(host) ||
    !user ||
    !pass ||
    !from ||
    !z.email().safeParse(from).success ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    (secureSetting !== undefined &&
      secureSetting !== "" &&
      !["true", "false"].includes(secureSetting))
  )
    return null;
  return {
    host,
    port,
    user,
    pass,
    from,
    secure: secureSetting ? secureSetting === "true" : port === 465,
  };
}

export function voucherEmailConfigured() {
  return Boolean(smtpConfig());
}

export const storeEmailConfigured = voucherEmailConfigured;

function createStoreMailer(kind: "voucher" | "inquiry") {
  const config = smtpConfig();
  if (!config)
    throw new HttpError(
      503,
      "Chưa kết nối dịch vụ gửi email. Cấu hình SMTP cho website trước khi gửi email.",
    );
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 15_000,
    dnsTimeout: 5_000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
  return {
    async send({
      to,
      subject,
      text,
      deliveryId,
    }: {
      to: string;
      subject: string;
      text: string;
      deliveryId: string;
    }) {
      const result = await transport.sendMail({
        from: { name: "Mộc Bàm", address: config.from },
        to: { address: to, name: "" },
        subject,
        text,
        messageId: `<${kind}-${deliveryId}@${config.from.split("@")[1]}>`,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (
        !result.accepted.some(
          (address) => String(address).toLowerCase() === to.toLowerCase(),
        )
      )
        throw Object.assign(new Error("SMTP recipient rejected"), {
          responseCode: 550,
        });
    },
    close: () => transport.close(),
  };
}

export function createVoucherMailer() {
  return createStoreMailer("voucher");
}

export function createInquiryMailer() {
  return createStoreMailer("inquiry");
}

export const storeDeliveryFailure = voucherDeliveryFailure;

export function voucherDeliveryFailure(error: unknown) {
  const details = error as { responseCode?: number; code?: string } | null;
  // A missing SMTP response after DATA can mean the provider already accepted
  // the email. Preserve that uncertainty and never retry automatically.
  if (details?.responseCode && details.responseCode >= 400)
    return {
      status: "failed" as const,
      message:
        "Máy chủ email từ chối gửi. Kiểm tra dịch vụ gửi và địa chỉ người nhận.",
    };
  if (
    details?.code === "EAUTH" ||
    details?.code === "EDNS" ||
    details?.code === "ECONNECTION"
  )
    return {
      status: "failed" as const,
      message: "Không kết nối hoặc đăng nhập được dịch vụ gửi email.",
    };
  return {
    status: "unknown" as const,
    message:
      "Chưa xác minh được kết quả gửi. Kiểm tra hộp thư đã gửi trước khi tạo lần gửi mới để tránh trùng email.",
  };
}
