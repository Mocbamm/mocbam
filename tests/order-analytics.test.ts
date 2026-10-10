import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deliverOrderAnalytics,
  purchaseEventPayload,
} from "@/lib/order-analytics-server";
import { orderAnalyticsSchema } from "@/lib/order-analytics";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  update: vi.fn(),
  fetch: vi.fn(),
  service: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceSupabase: mocks.service,
}));
const event = {
  order_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  event: "purchase" as const,
  occurred_at: "2026-10-10T01:00:00Z",
  client_id: "123.456",
  session_id: "789",
  value: 113000,
  shipping: 30000,
  items: [
    { item_id: "product", item_name: "Móc khóa", price: 120000, quantity: 1 },
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("GA_MEASUREMENT_PROTOCOL_SECRET", "private-test-secret");
  const update = { eq: vi.fn() };
  update.eq.mockReturnValue(update);
  mocks.update.mockReturnValue(update);
  mocks.service.mockReturnValue({
    rpc: mocks.rpc,
    from: () => ({ update: mocks.update }),
  });
  mocks.rpc
    .mockResolvedValueOnce({ data: [event], error: null })
    .mockResolvedValue({ data: [], error: null });
  mocks.fetch.mockResolvedValue(new Response(null, { status: 204 }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("consented successful-order analytics", () => {
  it("rejects personal fields, private paths and query strings before order creation", () => {
    const attribution = {
      consent: true,
      client_id: "123.456",
      session_id: "789",
      landing_path: "/san-pham",
    };
    expect(orderAnalyticsSchema.safeParse(attribution).success).toBe(true);
    for (const extra of [
      { consent: false },
      { client_id: "customer@example.com" },
      { landing_path: "/don-hang/secret" },
      { landing_path: "/?email=private" },
      { email: "private@example.test" },
      { landing_path: "//private.example" },
    ])
      expect(
        orderAnalyticsSchema.safeParse({ ...attribution, ...extra }).success,
      ).toBe(false);
  });
  it("does not query the outbox or send events without provider secrets", async () => {
    vi.stubEnv("GA_MEASUREMENT_PROTOCOL_SECRET", "");
    await deliverOrderAnalytics();
    expect(mocks.service).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("never dispatches from preview deployments, even with provider credentials", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENABLED", "true");
    await deliverOrderAnalytics();
    expect(mocks.service).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("sends real net merchandise value with a stable transaction ID and marks accepted events once", async () => {
    await deliverOrderAnalytics();
    await deliverOrderAnalytics();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = mocks.fetch.mock.calls[0];
    expect(url).toContain("/mp/collect?");
    expect(JSON.parse(init.body)).toMatchObject({
      client_id: "123.456",
      consent: { ad_user_data: "DENIED", ad_personalization: "DENIED" },
      events: [
        {
          name: "purchase",
          params: {
            transaction_id: event.order_id,
            value: 113000,
            shipping: 30000,
            currency: "VND",
            session_id: 789,
          },
        },
      ],
    });
    expect(init.cache).toBe("no-store");
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "sent",
        lease_until: null,
        accepted_at: expect.any(String),
      }),
    );
    expect(JSON.stringify(purchaseEventPayload(event))).not.toContain(
      "private-test-secret",
    );
    expect(
      purchaseEventPayload({ ...event, event: "refund" }).events[0].name,
    ).toBe("refund");
  });
  it.each(["http", "network"])(
    "retains transient %s failures for a later retry without failing staff changes",
    async (failure) => {
      if (failure === "http")
        mocks.fetch.mockResolvedValue(new Response(null, { status: 503 }));
      else mocks.fetch.mockRejectedValue(new Error("provider failed"));
      await expect(deliverOrderAnalytics()).resolves.toBeUndefined();
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending",
          lease_until: expect.any(String),
        }),
      );
    },
  );
  it("does not automatically replay a refund whose network acceptance is unknown", async () => {
    mocks.rpc
      .mockReset()
      .mockResolvedValueOnce({
        data: [{ ...event, event: "refund" }],
        error: null,
      })
      .mockResolvedValue({ data: [], error: null });
    mocks.fetch.mockRejectedValue(new Error("response lost after dispatch"));
    await deliverOrderAnalytics();
    expect(mocks.update).toHaveBeenCalledWith({
      status: "uncertain",
      lease_until: null,
    });
  });
});
