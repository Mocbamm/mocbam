import QRCode from "qrcode";
import type { BankTransfer, Order } from "./types";
import { transferReference } from "./payments";
import { buildVietQrPayload } from "./vietqr";

export async function bankTransferInstructions(
  order: Order,
): Promise<BankTransfer | null> {
  if (
    order.payment_method !== "bank_transfer" ||
    order.payment_status !== "awaiting_payment" ||
    order.status === "cancelled" ||
    order.total <= 0
  )
    return null;
  const reference = transferReference(order.reference);
  const payload = buildVietQrPayload({
    bankBin: order.payment_bank_bin,
    accountNumber: order.payment_bank_account_number,
    amount: Number(order.total),
    reference,
  });
  return {
    bankName: order.payment_bank_name,
    accountNumber: order.payment_bank_account_number,
    accountName: order.payment_bank_account_name,
    amount: Number(order.total),
    reference,
    qrDataUrl: await QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      width: 384,
      margin: 4,
    }),
  };
}
