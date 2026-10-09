import { z } from "zod";
import { getAdminTrafficReport } from "@/lib/ga-report-server";
import { apiError, json } from "@/lib/http";
import { reportPeriodRange } from "@/lib/store-reports";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const initial = reportPeriodRange(new Date(), "month");
    const range = z
      .object({ from: z.iso.date(), to: z.iso.date() })
      .refine((value) => value.from <= value.to)
      .parse({
        from: params.get("from") || initial.from,
        to: params.get("to") || initial.to,
      });
    return json(await getAdminTrafficReport(range));
  } catch (error) {
    return apiError(error);
  }
}
