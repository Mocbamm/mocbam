import { z } from "zod";

// Server-side only: kept apart from support.ts so the storefront chat bubble
// does not ship zod to every visitor.
export const supportMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(4000),
  })
  .strict();
