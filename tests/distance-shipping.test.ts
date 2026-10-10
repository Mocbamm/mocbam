import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/shipping/quote/route";
import { roadDistance } from "@/lib/shipping-server";
import { checkoutAddress, shippingDistanceBandsSchema } from "@/lib/shipping";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  service: vi.fn(),
  from: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceSupabase: mocks.service,
}));
const address = {
  address: "12 Test Road, Test Ward",
  city: "Hồ Chí Minh",
  ward: "Test Ward",
};
const origin = "1 Store Road, Store Ward, Hồ Chí Minh";
const quote = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  fee: 10000,
  distance_meters: 5000,
  name: "Khoảng cách đến 5 km",
  expires_at: "2026-10-11T01:15:00Z",
};
function request(body: unknown = address, source = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/shipping/quote", {
    method: "POST",
    headers: {
      origin: source,
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.7, 192.0.2.9",
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  vi.stubEnv("GOOGLE_MAPS_API_KEY", "fake-provider-key");
  vi.stubEnv("ORDER_TOKEN_SECRET", "fake-request-secret");
  vi.stubGlobal("fetch", mocks.fetch);
  const chain = { select: vi.fn(), eq: vi.fn(), single: mocks.single };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
  mocks.service.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
  mocks.single.mockResolvedValue({
    data: { shipping_distance_enabled: true, shipping_origin_address: origin },
    error: null,
  });
  mocks.rpc.mockImplementation(async (name: string) =>
    name === "reserve_shipping_request"
      ? { data: true, error: null }
      : { data: quote, error: null },
  );
  mocks.fetch.mockImplementation(async () =>
    Response.json({ routes: [{ distanceMeters: 5000 }] }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Google road-distance provider", () => {
  it("uses server-only credentials and a fixed driving-route endpoint with complete destination", async () => {
    expect(
      await roadDistance(origin, { ...address, address: "12 Test Road" }),
    ).toBe(5000);
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(url).toBe(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
    );
    expect(url).not.toContain("fake-provider-key");
    expect(options).toMatchObject({
      method: "POST",
      cache: "no-store",
      headers: {
        "X-Goog-Api-Key": "fake-provider-key",
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
    });
    expect(JSON.parse(options.body)).toMatchObject({
      origin: { address: `${origin}, Việt Nam` },
      destination: {
        address: "12 Test Road, Test Ward, Hồ Chí Minh, Việt Nam",
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      regionCode: "vn",
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    await roadDistance(origin, address);
    expect(
      JSON.parse(mocks.fetch.mock.calls[1][1].body).destination.address,
    ).toBe("12 Test Road, Test Ward, Hồ Chí Minh, Việt Nam");
  });
  it("accepts exact integer metres including a valid zero-distance route", async () => {
    for (const meters of [0, 1, 5000, 5001, 10000000]) {
      mocks.fetch.mockResolvedValueOnce(
        Response.json({ routes: [{ distanceMeters: meters }] }),
      );
      expect(await roadDistance(origin, address)).toBe(meters);
    }
  });
  it("fails closed on missing credentials, outages, malformed JSON, and invalid routes", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    await expect(roadDistance(origin, address)).rejects.toMatchObject({
      status: 503,
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "fake-provider-key");
    mocks.fetch.mockRejectedValueOnce(new Error("network"));
    await expect(roadDistance(origin, address)).rejects.toMatchObject({
      status: 503,
    });
    mocks.fetch.mockResolvedValueOnce(
      Response.json({ error: "sensitive provider detail" }, { status: 403 }),
    );
    await expect(roadDistance(origin, address)).rejects.toMatchObject({
      status: 503,
    });
    mocks.fetch.mockResolvedValueOnce(
      new Response("not JSON", { status: 200 }),
    );
    await expect(roadDistance(origin, address)).rejects.toMatchObject({
      status: 503,
    });
    for (const data of [
      null,
      {},
      { routes: [] },
      { routes: [{ distanceMeters: -1 }] },
      { routes: [{ distanceMeters: 1.5 }] },
      { routes: [{ distanceMeters: "5000" }] },
      { routes: [{ distanceMeters: 10000001 }] },
    ]) {
      mocks.fetch.mockResolvedValueOnce(Response.json(data));
      await expect(roadDistance(origin, address)).rejects.toMatchObject({
        status: 422,
      });
    }
  });
});

describe("distance quote API", () => {
  it("checks origin, strict address schema and body limits before accessing privileged data", async () => {
    expect(
      (await POST(request(address, "https://elsewhere.invalid"))).status,
    ).toBe(403);
    expect(
      (await POST(request({ ...address, distance_meters: 1, fee: 0 }))).status,
    ).toBe(400);
    expect((await POST(request({ ...address, ward: " " }))).status).toBe(400);
    expect(
      (await POST(request({ ...address, address: "x".repeat(4000) }))).status,
    ).toBe(413);
    expect(mocks.service).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("returns only server-certified fees after an atomic hashed-client limit reservation", async () => {
    const response = await POST(
      request({ ...address, city: ` ${address.city} ` }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const expectedKey = createHmac("sha256", "fake-request-secret")
      .update("shipping:203.0.113.7")
      .digest("hex");
    expect(mocks.rpc.mock.calls).toEqual([
      ["reserve_shipping_request", { p_key: expectedKey }],
      [
        "create_shipping_quote",
        {
          p_customer: address,
          p_distance_meters: 5000,
          p_origin_address: origin,
        },
      ],
    ]);
    const body = await response.json();
    expect(body).toEqual({ data: quote });
    expect(JSON.stringify(body)).not.toMatch(
      /fake-provider-key|fake-request-secret|203\.0\.113\.7|Store Road/,
    );
  });
  it("blocks disabled distance shipping, missing secrets and rate-limited clients before routing", async () => {
    mocks.single.mockResolvedValueOnce({
      data: {
        shipping_distance_enabled: false,
        shipping_origin_address: origin,
      },
      error: null,
    });
    expect((await POST(request())).status).toBe(409);
    vi.stubEnv("ORDER_TOKEN_SECRET", "");
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv("ORDER_TOKEN_SECRET", "fake-request-secret");
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await POST(request())).status).toBe(429);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.rpc.mock.calls).toHaveLength(1);
  });
  it("propagates stale-origin rejection after provider response without certifying a quote", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "reserve_shipping_request"
        ? { data: true, error: null }
        : { data: null, error: { message: "SHIPPING_QUOTE_EXPIRED" } },
    );
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("tính lại phí");
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "create_shipping_quote",
      expect.objectContaining({ p_origin_address: origin }),
    );
  });
  it("does not certify a quote when the provider is unavailable", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual([
      "reserve_shipping_request",
    ]);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

it("validates ordered inclusive km bands and matches the checkout's saved full address", () => {
  expect(
    shippingDistanceBandsSchema.parse([
      { up_to_km: 0.001, fee: 0 },
      { up_to_km: 5, fee: 10000 },
    ]),
  ).toHaveLength(2);
  for (const bands of [
    [{ up_to_km: 5.0001, fee: 1 }],
    [{ up_to_km: 0, fee: 1 }],
    [{ up_to_km: 5, fee: -1 }],
    [
      { up_to_km: 5, fee: 1 },
      { up_to_km: 5, fee: 2 },
    ],
    [
      { up_to_km: 10, fee: 1 },
      { up_to_km: 5, fee: 2 },
    ],
  ])
    expect(shippingDistanceBandsSchema.safeParse(bands).success).toBe(false);
  expect(
    checkoutAddress(" 12 Test Road ", " Hồ Chí Minh ", " Test Ward "),
  ).toEqual(address);
});
