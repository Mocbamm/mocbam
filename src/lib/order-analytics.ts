import { z } from "zod";

// No email, phone, account ID, receipt URL, query string or ad identifiers.
export const orderAnalyticsSchema = z
  .object({
    consent: z.literal(true),
    client_id: z.string().regex(/^\d{1,20}\.\d{1,20}$/),
    session_id: z.string().regex(/^[1-9]\d{0,14}$/),
    landing_path: z
      .string()
      .max(500)
      .regex(/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]*$/)
      .refine((path) => !/^\/(admin|auth|tai-khoan|don-hang)(\/|$)/.test(path)),
  })
  .strict();

export type OrderAnalytics = z.infer<typeof orderAnalyticsSchema>;
