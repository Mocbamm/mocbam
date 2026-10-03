import { afterEach, describe, expect, it, vi } from "vitest";
import { trackStoreEvent } from "../src/lib/analytics";

afterEach(() => vi.unstubAllGlobals());
function browser(pathname: string, consent: boolean) {
  const gtag = vi.fn(),
    fbq = vi.fn();
  vi.stubGlobal("window", {
    location: { pathname },
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
    expect(gtag).toHaveBeenCalledWith("event", "order_submitted", {
      value: 189000,
      currency: "VND",
    });
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
