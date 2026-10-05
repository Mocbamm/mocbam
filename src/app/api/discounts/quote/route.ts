import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin, json, readJson } from "@/lib/http";
import { quoteDiscount } from "@/lib/promotions";
import { discountCodeSchema, orderSchema } from "@/lib/validation";

const quoteSchema = z
  .object({
    code: discountCodeSchema.min(1),
    items: orderSchema.shape.items,
  })
  .strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = quoteSchema.parse(await readJson(request, 8_000));
    const user = await getCurrentUser();
    return json(await quoteDiscount(input.code, input.items, user?.id || null));
  } catch (error) {
    return apiError(error);
  }
}
