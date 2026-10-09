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
