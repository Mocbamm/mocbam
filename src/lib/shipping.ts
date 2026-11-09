// Used by checkout in the browser, so it must stay free of zod; the
// validation schemas live in shipping-schema.ts.
export type ShippingZone = {
  name: string;
  province: string;
  wards: string[];
  fee: number;
};
export type ShippingDistanceBand = { up_to_km: number; fee: number };
export type ShippingAddress = { address: string; city: string; ward: string };
export type ShippingDistanceQuote = {
  id: string;
  fee: number;
  distance_meters: number;
  expires_at: string;
  name: string;
};
export function checkoutAddress(
  address: string,
  city: string,
  ward: string,
): ShippingAddress {
  return {
    address: [address.trim(), ward.trim()].filter(Boolean).join(", "),
    city: city.trim(),
    ward: ward.trim(),
  };
}
const normalize = (value: string) => value.trim().toLocaleLowerCase("vi");

// Free shipping from a goods subtotal (before vouchers), matching the
// database's order_shipping_fee. 0 means the offer is off.
export function freeShipping(subtotal: number, threshold = 0) {
  const active = threshold > 0;
  return {
    active,
    free: active && subtotal >= threshold,
    remaining: active ? Math.max(0, threshold - subtotal) : 0,
  };
}

export function quoteShipping(
  fallback: number,
  zones: ShippingZone[],
  province: string,
  ward: string,
  zonesOnly = false,
) {
  const candidates = zones.filter(
    (zone) => normalize(zone.province) === normalize(province),
  );
  const zone =
    candidates.find(
      (zone) =>
        zone.wards.length &&
        zone.wards.some((item) => normalize(item) === normalize(ward)),
    ) || candidates.find((zone) => !zone.wards.length);
  // With zonesOnly the shop delivers only to its listed areas; the server
  // refuses other addresses (SHIPPING_UNAVAILABLE) instead of charging a fee.
  return {
    fee: zone?.fee ?? fallback,
    name: zone?.name || "Phí giao hàng tiêu chuẩn",
    available: Boolean(zone) || !zonesOnly,
  };
}
