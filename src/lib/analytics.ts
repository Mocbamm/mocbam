export type StoreEvent =
  | "view_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "order_submitted";
export type AnalyticsConsent = "pending" | "granted" | "denied";
type AnalyticsWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  mocbamAnalyticsConsent?: boolean;
};
const events = new Set<StoreEvent>([
  "view_item",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "order_submitted",
]);
const itemStrings = new Set(["item_id", "item_name", "item_category"]);
const itemNumbers = new Set(["price", "quantity"]);

export function isAnalyticsPathAllowed(pathname: string) {
  return !/^\/(admin|auth|don-hang)(\/|$)/.test(pathname);
}
export function isAnalyticsEnabled({
  production,
  preview,
  localOverride,
  hasProvider,
}: {
  production: boolean;
  preview: boolean;
  localOverride: boolean;
  hasProvider: boolean;
}) {
  return !preview && (production || localOverride) && hasProvider;
}
function safeParameters(parameters: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  if (parameters.currency === "VND") safe.currency = "VND";
  for (const key of ["value", "num_items"]) {
    const value = parameters[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0)
      safe[key] = value;
  }
  if (parameters.content_type === "product") safe.content_type = "product";
  if (Array.isArray(parameters.content_ids))
    safe.content_ids = parameters.content_ids
      .filter((id): id is string => typeof id === "string")
      .slice(0, 20);
  if (Array.isArray(parameters.items))
    safe.items = parameters.items.slice(0, 20).flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      return [
        Object.fromEntries(
          Object.entries(item).filter(
            ([key, value]) =>
              (itemStrings.has(key) && typeof value === "string") ||
              (itemNumbers.has(key) &&
                typeof value === "number" &&
                Number.isFinite(value) &&
                value >= 0),
          ),
        ),
      ];
    });
  return safe;
}
export function trackStoreEvent(
  event: StoreEvent,
  parameters: Record<string, unknown>,
) {
  if (typeof window === "undefined" || !events.has(event)) return false;
  const target = window as AnalyticsWindow;
  if (
    !target.mocbamAnalyticsConsent ||
    !isAnalyticsPathAllowed(window.location.pathname) ||
    (!target.gtag && !target.fbq)
  )
    return false;
  const safe = safeParameters(parameters);
  target.gtag?.("event", event, {
    ...safe,
    page_path: window.location.pathname,
    page_location: `${window.location.origin}${window.location.pathname}`,
    page_referrer: window.location.origin,
  });
  const metaEvents: Partial<Record<StoreEvent, string>> = {
    view_item: "ViewContent",
    add_to_cart: "AddToCart",
    begin_checkout: "InitiateCheckout",
  };
  const metaCustomEvents: Partial<Record<StoreEvent, string>> = {
    remove_from_cart: "RemoveFromCart",
    order_submitted: "OrderSubmitted",
  };
  if (metaEvents[event]) target.fbq?.("track", metaEvents[event], safe);
  else target.fbq?.("trackCustom", metaCustomEvents[event], safe);
  return true;
}

/** Track only a user-requested change; hydration and checkout clearing do not call this. */
export function trackCartQuantityChange(
  product: { id: string; name: string; price: number },
  previousQuantity: number,
  nextQuantity: number,
) {
  if (
    ![previousQuantity, nextQuantity].every(
      (quantity) => Number.isInteger(quantity) && quantity >= 0,
    )
  )
    return false;
  const delta = nextQuantity - previousQuantity;
  if (!delta) return false;
  return trackStoreEvent(delta > 0 ? "add_to_cart" : "remove_from_cart", {
    currency: "VND",
    value: product.price * Math.abs(delta),
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: Math.abs(delta),
      },
    ],
    content_ids: [product.id],
    content_type: "product",
  });
}

export type AnalyticsSession = {
  pathname: string;
  pageTracked: boolean;
  ready: boolean;
};
export function createAnalyticsSession(): AnalyticsSession {
  return { pathname: "", pageTracked: false, ready: false };
}
/** One page view per navigation; consent changes only resume pending product events. */
export function syncAnalyticsPage(
  session: AnalyticsSession,
  {
    pathname,
    enabled,
    consent,
    loaded,
    gaId,
  }: {
    pathname: string;
    enabled: boolean;
    consent: AnalyticsConsent;
    loaded: boolean;
    gaId: string;
  },
) {
  if (typeof window === "undefined") return;
  const target = window as AnalyticsWindow;
  if (session.pathname !== pathname) {
    session.pathname = pathname;
    session.pageTracked = false;
  }
  const ready =
    enabled &&
    consent === "granted" &&
    loaded &&
    isAnalyticsPathAllowed(pathname);
  target.mocbamAnalyticsConsent = ready;
  if (gaId)
    (target as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] =
      !ready;
  if (!ready) {
    target.fbq?.("consent", "revoke");
    session.ready = false;
    return;
  }
  target.fbq?.("consent", "grant");
  const newPageView = !session.pageTracked;
  if (newPageView) {
    session.pageTracked = true;
    target.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: `${window.location.origin}${pathname}`,
      page_referrer: window.location.origin,
    });
    target.fbq?.("track", "PageView");
  }
  if (!session.ready || newPageView)
    window.dispatchEvent(new Event("mocbam:analytics-ready"));
  session.ready = true;
}
