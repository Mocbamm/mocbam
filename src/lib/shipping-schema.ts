import { z } from "zod";
import type { ShippingDistanceBand, ShippingZone } from "./shipping";

// Server-side and admin validation, kept apart from shipping.ts so the
// checkout page does not ship zod. The annotations keep these schemas in step
// with the plain types in shipping.ts.
export const shippingZoneSchema: z.ZodType<ShippingZone> = z
  .object({
    name: z.string().trim().min(1).max(100),
    province: z.string().trim().min(1).max(100),
    wards: z.array(z.string().trim().min(1).max(100)).max(200),
    fee: z.number().int().min(0).max(100_000_000),
  })
  .strict();
export const shippingDistanceBandSchema: z.ZodType<ShippingDistanceBand> = z
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
