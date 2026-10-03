import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error instanceof ZodError)
    return json(
      {
        error:
          "Thông tin không hợp lệ. Vui lòng kiểm tra lại các trường và số lượng.",
        fields: error.issues.map((issue) => issue.path.join(".")),
      },
      400,
    );
  console.error(
    "API operation failed",
    error instanceof Error ? error.message : "Unknown failure",
  );
  return json(
    { error: "Không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau." },
    500,
  );
}

export function requestOrigin(request: Request) {
  if (process.env.NEXT_PUBLIC_SITE_URL)
    return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
  const url = new URL(request.url);
  const host =
    request.headers.get("host") ||
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "https" || forwardedProtocol === "http"
      ? `${forwardedProtocol}:`
      : url.protocol;
  if (host && !/[\s/@\\?#]/.test(host))
    return new URL(`${protocol}//${host}`).origin;
  return url.origin;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = requestOrigin(request);
  if (!origin || origin !== expected)
    throw new HttpError(403, "Yêu cầu phải được gửi từ website của cửa hàng.");
}

export async function readJson(
  request: Request,
  maxBytes = 24_000,
): Promise<unknown> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new HttpError(415, "Yêu cầu phải ở định dạng JSON.");
  const buffer = await readBody(request, maxBytes);
  try {
    return JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    throw new HttpError(400, "Nội dung JSON không hợp lệ.");
  }
}

export async function readBody(request: Request, maxBytes: number) {
  const size = Number(request.headers.get("content-length") || 0);
  if (size > maxBytes) throw new HttpError(413, "Nội dung quá dài.");
  if (!request.body) throw new HttpError(400, "Thiếu nội dung yêu cầu.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Nội dung quá dài.");
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}

export function safeNext(value: string | null, fallback = "/tai-khoan") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value) ||
    value.startsWith("/auth/")
  )
    return fallback;
  return value;
}

export function databaseError(error: { message: string; code?: string }) {
  const known: Record<string, [number, string]> = {
    STOCK_UNAVAILABLE: [
      409,
      "Sản phẩm không còn đủ hàng. Vui lòng cập nhật giỏ hàng.",
    ],
    PRODUCT_UNAVAILABLE: [409, "Một sản phẩm không còn được bán."],
    IDEMPOTENCY_CONFLICT: [
      409,
      "Mã gửi đơn đã được dùng cho nội dung khác. Vui lòng tạo yêu cầu mới.",
    ],
    ORDER_NOT_FOUND: [404, "Không tìm thấy đơn hàng."],
    ORDER_FINAL: [409, "Không thể thay đổi đơn hàng đã hoàn tất hoặc đã huỷ."],
    BANK_TRANSFER_UNAVAILABLE: [
      409,
      "Chuyển khoản chưa được mở. Vui lòng chọn thanh toán khi nhận hàng.",
    ],
    PAYMENT_TRANSITION_CONFLICT: [
      409,
      "Trạng thái thanh toán đã thay đổi hoặc không cho phép thao tác này. Vui lòng tải lại đơn hàng.",
    ],
    INVALID_PAYMENT_NOTE: [
      400,
      "Vui lòng nhập mã giao dịch hoặc ghi chú xác nhận tiền.",
    ],
    INVALID_REQUEST: [400, "Thông tin không hợp lệ. Vui lòng kiểm tra lại."],
    TOO_MANY_REQUESTS: [
      429,
      "Bạn đã gửi nhiều yêu cầu. Vui lòng đợi rồi thử lại.",
    ],
  };
  for (const [key, [status, message]] of Object.entries(known))
    if (error.message.includes(key)) return new HttpError(status, message);
  if (error.code === "23505")
    return new HttpError(409, "Mã hoặc đường dẫn này đã tồn tại.");
  if (["23503", "23514", "22P02"].includes(error.code || ""))
    return new HttpError(
      400,
      "Dữ liệu không hợp lệ hoặc tham chiếu không tồn tại.",
    );
  console.error("Database operation failed", error.code || "unknown");
  return new HttpError(
    503,
    "Không thể truy cập dữ liệu lúc này. Vui lòng thử lại sau.",
  );
}
