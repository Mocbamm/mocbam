// Server-only: provider secrets and pseudonymous GA IDs never enter reports/receipts.
import { createServiceSupabase } from "./supabase/admin";

type PendingEvent = {
  order_id: string;
  event: "purchase" | "refund";
  occurred_at: string;
  client_id: string;
  session_id: string;
  value: number;
  shipping: number;
  items: {
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
  }[];
};

export function purchaseAnalyticsConfigured() {
  return Boolean(
    process.env.VERCEL_ENV !== "preview" &&
      (process.env.NODE_ENV === "production" ||
        process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true") &&
      process.env.GA_MEASUREMENT_PROTOCOL_SECRET &&
      /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_ID || ""),
  );
}

export function purchaseEventPayload(event: PendingEvent) {
  return {
    client_id: event.client_id,
    timestamp_micros: new Date(event.occurred_at).getTime() * 1000,
    consent: { ad_user_data: "DENIED", ad_personalization: "DENIED" },
    events: [
      {
        name: event.event,
        params: {
          transaction_id: event.order_id,
          currency: "VND",
          value: Number(event.value),
          shipping: Number(event.shipping),
          session_id: Number(event.session_id),
          engagement_time_msec: 1,
          items: event.items,
        },
      },
    ],
  };
}

/** Best effort after staff changes and on report refresh; the durable queue retains failures. */
export async function deliverOrderAnalytics() {
  if (!purchaseAnalyticsConfigured()) return;
  try {
    const db = createServiceSupabase();
    // Two rounds allow a queued purchase followed by its refund in one refresh.
    for (let round = 0; round < 2; round++) {
      const { data, error } = await db.rpc("claim_order_analytics", {
        p_limit: 10,
      });
      if (error || !Array.isArray(data) || !data.length) return;
      await Promise.all(
        data.map(async (event: PendingEvent) => {
          let accepted = false;
          let uncertain = false;
          try {
            const query = new URLSearchParams({
              measurement_id: process.env.NEXT_PUBLIC_GA_ID!,
              api_secret: process.env.GA_MEASUREMENT_PROTOCOL_SECRET!,
            });
            const response = await fetch(
              `https://www.google-analytics.com/mp/collect?${query}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(purchaseEventPayload(event)),
                cache: "no-store",
                signal: AbortSignal.timeout(5_000),
              },
            );
            accepted = response.ok;
          } catch {
            /* Retry with the same transaction ID; never log provider URLs/secrets. */
            uncertain = event.event === "refund";
          }
          await db
            .from("order_analytics_events")
            .update({
              status: accepted ? "sent" : uncertain ? "uncertain" : "pending",
              lease_until:
                accepted || uncertain
                  ? null
                  : new Date(Date.now() + 60_000).toISOString(),
              ...(accepted ? { accepted_at: new Date().toISOString() } : {}),
            })
            .eq("order_id", event.order_id)
            .eq("event", event.event)
            .eq("status", "sending");
        }),
      );
    }
  } catch {
    /* Analytics must never roll back an order, payment or fulfillment change. */
  }
}
