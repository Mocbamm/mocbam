export type StoreEvent =
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "order_submitted";
type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  mocbamAnalyticsConsent?: boolean;
};
const events = new Set([
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "order_submitted",
]);
const allowed = new Set([
  "currency",
  "value",
  "items",
  "content_ids",
  "content_type",
  "num_items",
]);
export function trackStoreEvent(
  event: StoreEvent,
  parameters: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !events.has(event)) return false;
  const target = window as AnalyticsWindow;
  if (
    !target.mocbamAnalyticsConsent ||
    /^\/(admin|auth|don-hang)(\/|$)/.test(window.location.pathname)
  )
    return false;
  const safe = Object.fromEntries(
    Object.entries(parameters).filter(([key]) => allowed.has(key)),
  );
  target.gtag?.("event", event, safe);
  const metaEvents: Partial<Record<StoreEvent, string>> = {
    view_item: "ViewContent",
    add_to_cart: "AddToCart",
    begin_checkout: "InitiateCheckout",
  };
  if (metaEvents[event]) target.fbq?.("track", metaEvents[event], safe);
  else target.fbq?.("trackCustom", "OrderSubmitted", safe);
  return true;
}
