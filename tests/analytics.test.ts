import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAnalyticsSession,
  isAnalyticsEnabled,
  syncAnalyticsPage,
  trackCartQuantityChange,
  trackStoreEvent,
} from "../src/lib/analytics";

afterEach(() => vi.unstubAllGlobals());
function browser(pathname: string, consent: boolean) {
  const gtag = vi.fn(),
    fbq = vi.fn();
  vi.stubGlobal("window", {
    location: { pathname, origin: "https://mocbam.example" },
    dispatchEvent: vi.fn(),
    mocbamAnalyticsConsent: consent,
    gtag,
    fbq,
  });
  return { gtag, fbq };
}
describe("shopping analytics", () => {
  it("does not send events before consent", () => {
    const { gtag, fbq } = browser("/san-pham", false);
    trackStoreEvent("add_to_cart", { value: 189000, currency: "VND" });
    expect(gtag).not.toHaveBeenCalled();
    expect(fbq).not.toHaveBeenCalled();
  });
  it.each(["/admin", "/admin/orders", "/auth/callback", "/don-hang/private"])(
    "excludes %s",
    (path) => {
      const { gtag, fbq } = browser(path, true);
      trackStoreEvent("begin_checkout", { value: 10 });
      expect(gtag).not.toHaveBeenCalled();
      expect(fbq).not.toHaveBeenCalled();
    },
  );
  it("maps an unpaid order to a custom event and excludes personal data", () => {
    const { gtag, fbq } = browser("/thanh-toan", true);
    trackStoreEvent("order_submitted", {
      value: 189000,
      currency: "VND",
      email: "demo@example.test",
      phone: "0901234567",
      token: "private",
    });
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "order_submitted",
      expect.objectContaining({
        value: 189000,
        currency: "VND",
        page_path: "/thanh-toan",
        page_location: "https://mocbam.example/thanh-toan",
      }),
    );
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("private");
    expect(fbq).toHaveBeenCalledWith("trackCustom", "OrderSubmitted", {
      value: 189000,
      currency: "VND",
    });
    expect(JSON.stringify(fbq.mock.calls)).not.toContain("Purchase");
  });
  it("maps product and cart events to both providers", () => {
    const { gtag, fbq } = browser("/san-pham/meo-moc", true);
    trackStoreEvent("view_item", { content_ids: ["product"], currency: "VND" });
    trackStoreEvent("add_to_cart", { value: 189000, currency: "VND" });
    expect(gtag).toHaveBeenCalledTimes(2);
    expect(fbq.mock.calls.map((c) => c[1])).toEqual([
      "ViewContent",
      "AddToCart",
    ]);
  });
});

describe("cart quantity analytics", () => {
  const product = { id: "wood-cat", name: "Mèo Mộc", price: 189000 };
  it("tracks added units, removed units and deletion using the actual delta", () => {
    const { gtag, fbq } = browser("/gio-hang", true);
    trackCartQuantityChange(product, 1, 3);
    trackCartQuantityChange(product, 3, 2);
    trackCartQuantityChange(product, 2, 0);
    expect(
      gtag.mock.calls.map((call) => [
        call[1],
        call[2].value,
        call[2].items[0].quantity,
      ]),
    ).toEqual([
      ["add_to_cart", 378000, 2],
      ["remove_from_cart", 189000, 1],
      ["remove_from_cart", 378000, 2],
    ]);
    expect(fbq.mock.calls.map((call) => [call[0], call[1]])).toEqual([
      ["track", "AddToCart"],
      ["trackCustom", "RemoveFromCart"],
      ["trackCustom", "RemoveFromCart"],
    ]);
  });
  it("does not report unchanged, capped or malformed quantity requests", () => {
    const { gtag, fbq } = browser("/gio-hang", true);
    for (const [before, after] of [
      [10, 10],
      [1, -1],
      [1, 1.5],
      [0, 0],
    ])
      trackCartQuantityChange(product, before, after);
    expect(gtag).not.toHaveBeenCalled();
    expect(fbq).not.toHaveBeenCalled();
  });
});

describe("analytics page lifecycle", () => {
  const options = {
    pathname: "/san-pham/meo-moc",
    enabled: true,
    consent: "granted" as const,
    loaded: true,
    gaId: "",
  };
  it("sends one page view across repeated renders and a consent revoke/regrant", () => {
    const { gtag, fbq } = browser(options.pathname, true);
    const session = createAnalyticsSession();
    syncAnalyticsPage(session, options);
    syncAnalyticsPage(session, options);
    syncAnalyticsPage(session, { ...options, consent: "pending" });
    syncAnalyticsPage(session, { ...options, consent: "denied" });
    syncAnalyticsPage(session, options);
    expect(
      gtag.mock.calls.filter((call) => call[1] === "page_view"),
    ).toHaveLength(1);
    expect(
      fbq.mock.calls.filter((call) => call[1] === "PageView"),
    ).toHaveLength(1);
    expect(window.dispatchEvent).toHaveBeenCalledTimes(2);
  });
  it("counts a new visit when returning from an excluded route without tracking that route", () => {
    const { gtag, fbq } = browser(options.pathname, true);
    const session = createAnalyticsSession();
    syncAnalyticsPage(session, options);
    syncAnalyticsPage(session, { ...options, pathname: "/don-hang/private" });
    expect(
      (window as Window & { mocbamAnalyticsConsent?: boolean })
        .mocbamAnalyticsConsent,
    ).toBe(false);
    syncAnalyticsPage(session, options);
    expect(
      gtag.mock.calls.filter((call) => call[1] === "page_view"),
    ).toHaveLength(2);
    expect(JSON.stringify(gtag.mock.calls)).not.toContain("private");
    expect(fbq).toHaveBeenCalledWith("consent", "revoke");
  });
  it("waits for opt-in and bootstrap before resuming a pending product view", () => {
    const { gtag } = browser(options.pathname, false);
    const session = createAnalyticsSession();
    syncAnalyticsPage(session, {
      ...options,
      consent: "pending",
      loaded: false,
    });
    syncAnalyticsPage(session, { ...options, loaded: false });
    expect(gtag).not.toHaveBeenCalled();
    expect(window.dispatchEvent).not.toHaveBeenCalled();
    syncAnalyticsPage(session, options);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    expect(gtag.mock.calls[0][2].page_location).toBe(
      "https://mocbam.example/san-pham/meo-moc",
    );
  });
  it("disables previews even when a local analytics override is enabled", () => {
    expect(
      isAnalyticsEnabled({
        production: false,
        preview: true,
        localOverride: true,
        hasProvider: true,
      }),
    ).toBe(false);
    const { gtag, fbq } = browser(options.pathname, true);
    syncAnalyticsPage(createAnalyticsSession(), { ...options, enabled: false });
    trackStoreEvent("add_to_cart", { value: 1 });
    expect(gtag).not.toHaveBeenCalled();
    expect(
      fbq.mock.calls.filter(
        (call) => call[0] === "track" || call[0] === "trackCustom",
      ),
    ).toHaveLength(0);
  });
  it("filters nested personal data and non-finite numeric values", () => {
    const { gtag } = browser(options.pathname, true);
    trackStoreEvent("add_to_cart", {
      value: NaN,
      items: [
        {
          item_id: "wood-cat",
          quantity: 2,
          email: "private",
          address: "private",
        },
      ],
      content_ids: ["wood-cat", { email: "private" }],
    });
    expect(gtag.mock.calls[0][2]).toMatchObject({
      items: [{ item_id: "wood-cat", quantity: 2 }],
      content_ids: ["wood-cat"],
    });
  });
});
