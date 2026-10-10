import "server-only";
import { HttpError } from "./http";
import type { ShippingAddress } from "./shipping";

export async function roadDistance(
  origin: string,
  destination: ShippingAddress,
) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key)
    throw new HttpError(
      503,
      "Dịch vụ tính khoảng cách chưa được cấu hình. Vui lòng liên hệ Mộc.",
    );
  const wardSuffix = `, ${destination.ward.trim()}`;
  const address = destination.address.trim();
  const routedAddress = address
    .toLocaleLowerCase("vi")
    .endsWith(wardSuffix.toLocaleLowerCase("vi"))
    ? address
    : `${address}${wardSuffix}`;
  let response: Response;
  try {
    response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: { address: `${origin}, Việt Nam` },
          destination: {
            address: `${routedAddress}, ${destination.city}, Việt Nam`,
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          regionCode: "vn",
          languageCode: "vi-VN",
          units: "METRIC",
        }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
  } catch {
    throw new HttpError(
      503,
      "Chưa thể tính khoảng cách lúc này. Vui lòng thử lại.",
    );
  }
  if (!response.ok)
    throw new HttpError(
      503,
      "Dịch vụ tính khoảng cách đang gián đoạn. Vui lòng thử lại hoặc liên hệ Mộc.",
    );
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new HttpError(
      503,
      "Dịch vụ tính khoảng cách trả dữ liệu không hợp lệ. Vui lòng thử lại.",
    );
  }
  const meters =
    typeof data === "object" &&
    data !== null &&
    "routes" in data &&
    Array.isArray(data.routes)
      ? data.routes[0]?.distanceMeters
      : undefined;
  if (!Number.isInteger(meters) || meters < 0 || meters > 10000000)
    throw new HttpError(
      422,
      "Không tìm thấy đường giao hàng đến địa chỉ này. Vui lòng kiểm tra số nhà, đường và phường/xã.",
    );
  return meters as number;
}
