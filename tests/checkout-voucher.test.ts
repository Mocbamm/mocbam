import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { demoProducts } from "@/lib/demo-data";
import { CheckoutScreen } from "@/components/store/cart-checkout";

const hooks = vi.hoisted(() => ({ state: vi.fn(), cart: vi.fn() }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: hooks.state,
  useRef: () => ({ current: "" }),
  useEffect: () => {},
}));
vi.mock("@/lib/cart", () => ({ useCart: hooks.cart }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

type Props = Record<string, unknown> & { children?: ReactNode };
function find(node: ReactNode, predicate: (props: Props) => boolean): Props {
  for (const child of Array.isArray(node) ? node : [node]) {
    if (!child || typeof child !== "object" || !("props" in child)) continue;
    const props = (child as ReactElement<Props>).props;
    if (predicate(props)) return props;
    if (props.children) {
      try {
        return find(props.children, predicate);
      } catch {
        // Continue through sibling elements.
      }
    }
  }
  throw new Error("Checkout control missing");
}

function checkout({
  code = "SAVE5",
  busy = false,
  quoting = false,
  configured = true,
} = {}) {
  let state = 0;
  // Only replace the hook runtime; handlers and controls are the real checkout.
  const values = [
    busy,
    { province: "", ward: "", address: "" },
    null,
    0,
    "",
    "cod",
    code,
    null,
    "",
    quoting,
  ];
  hooks.state.mockImplementation(() => [values[state++], vi.fn()]);
  return CheckoutScreen({
    shippingFee: 0,
    configured,
    bankTransferAvailable: false,
  });
}

describe("checkout voucher keyboard behavior", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    hooks.cart.mockReturnValue({
      ready: true,
      items: [{ product: demoProducts[0], variant_id: "pink", quantity: 2 }],
      subtotal: demoProducts[0].price * 2,
      clear: vi.fn(),
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ code: "SAVE5", discount_amount: 5000 }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("Enter applies the voucher and prevents implicit order submission", async () => {
    const input = find(checkout(), (p) => p.id === "checkout-discount");
    const preventDefault = vi.fn();
    expect(input.onKeyDown).toEqual(expect.any(Function));
    (input.onKeyDown as (e: unknown) => void)({
      key: "Enter",
      nativeEvent: {},
      preventDefault,
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/discounts/quote",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          code: "SAVE5",
          items: [
            { product_id: demoProducts[0].id, variant_id: "pink", quantity: 2 },
          ],
        }),
      }),
    );
  });

  it("the apply button uses the same quote behavior", async () => {
    const button = find(checkout(), (p) => p.children === "Áp dụng");
    expect(button.type).toBe("button");
    await (button.onClick as () => Promise<void>)();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/discounts/quote",
    ]);
  });

  it.each([
    { code: " " },
    { busy: true },
    { quoting: true },
    { configured: false },
  ])("does not request a quote when unavailable: %j", (options) => {
    const input = find(checkout(options), (p) => p.id === "checkout-discount");
    const preventDefault = vi.fn();
    (input.onKeyDown as (e: unknown) => void)({
      key: "Enter",
      nativeEvent: {},
      preventDefault,
    });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves ordinary typing and IME composition", () => {
    const input = find(checkout(), (p) => p.id === "checkout-discount");
    for (const [key, isComposing] of [
      ["a", false],
      ["Enter", true],
    ]) {
      const preventDefault = vi.fn();
      (input.onKeyDown as (e: unknown) => void)({
        key,
        nativeEvent: { isComposing },
        preventDefault,
      });
      expect(preventDefault).not.toHaveBeenCalled();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
