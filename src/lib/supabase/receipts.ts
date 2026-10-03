import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "@/lib/http";

export function tokenForRequest(id: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`mocbam-order:${id}`)
    .digest("base64url");
}
export function receiptToken(id: string) {
  const secret = process.env.ORDER_TOKEN_SECRET;
  if (!secret || secret.length < 32)
    throw new HttpError(
      503,
      "Cửa hàng chưa cấu hình bảo mật tiếp nhận đơn hàng.",
    );
  return tokenForRequest(id, secret);
}
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function matchesReceipt(token: string | null, hash: string) {
  if (
    !token ||
    !/^[A-Za-z0-9_-]{43}$/.test(token) ||
    !/^[a-f0-9]{64}$/.test(hash)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(digest(token), "hex"),
    Buffer.from(hash, "hex"),
  );
}
