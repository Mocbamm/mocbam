import type { PaymentMethod, PaymentStatus, SiteSettings } from "./types";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
  unconfigured: "Chưa chọn phương thức",
};
export const paymentStatusLabels: Record<PaymentStatus, string> = {
  awaiting_payment: "Chờ thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
};

export function isBankTransferAvailable(settings: SiteSettings): boolean {
  return !!(
    settings.bank_transfer_enabled &&
    /^[0-9]{6}$/.test(settings.bank_bin) &&
    /^[A-Za-z0-9]{5,19}$/.test(settings.bank_account_number) &&
    settings.bank_name.trim() &&
    settings.bank_account_name.trim()
  );
}

export function transferReference(reference: string): string {
  if (!/^MB-[0-9]+$/.test(reference))
    throw new Error("Invalid order reference");
  return reference.replace("-", "");
}
