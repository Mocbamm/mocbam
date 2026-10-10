import { z } from "zod";

export const shippingZoneSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    province: z.string().trim().min(1).max(100),
    wards: z.array(z.string().trim().min(1).max(100)).max(200),
    fee: z.number().int().min(0).max(100_000_000),
  })
  .strict();
export type ShippingZone = z.infer<typeof shippingZoneSchema>;
export const shippingDistanceBandSchema = z
  .object({
    up_to_km: z.number().positive().max(3000).multipleOf(0.001),
    fee: z.number().int().min(0).max(100_000_000),
  })
  .strict();
export const shippingDistanceBandsSchema = z
  .array(shippingDistanceBandSchema)
  .max(50)
  .refine(
    (bands) =>
      bands.every(
        (band, index) =>
          index === 0 || band.up_to_km > bands[index - 1].up_to_km,
      ),
    "Các mốc km phải tăng dần và không trùng nhau.",
  );
export type ShippingDistanceBand = z.infer<typeof shippingDistanceBandSchema>;
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

export function quoteShipping(
  fallback: number,
  zones: ShippingZone[],
  province: string,
  ward: string,
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
  return {
    fee: zone?.fee ?? fallback,
    name: zone?.name || "Phí giao hàng tiêu chuẩn",
  };
}
