import { generateKeyPairSync, verify } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminTrafficReport } from "@/lib/ga-report-server";
import {
  mapTrafficReport,
  trafficCsv,
  trafficMetricNames,
  type GaTable,
} from "@/lib/traffic-reports";
import { GET } from "@/app/api/admin/traffic/route";
import { HttpError } from "@/lib/http";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.requireAdmin }));
const range = { from: "2026-10-01", to: "2026-10-09" };
function table(
  dimensions: string[],
  metrics: readonly string[],
  rows: { dimensions?: string[]; metrics: number[] }[] = [],
): GaTable {
  return {
    dimensionHeaders: dimensions.map((name) => ({ name })),
    metricHeaders: metrics.map((name) => ({ name })),
    rows: rows.map((row) => ({
      dimensionValues: row.dimensions?.map((value) => ({ value })),
      metricValues: row.metrics.map((value) => ({ value: String(value) })),
    })),
    rowCount: rows.length,
  };
}
function reports() {
  const breakdown = [
    "totalUsers",
    "sessions",
    "screenPageViews",
    "engagementRate",
    "bounceRate",
  ];
  return [
    {
      ...table([], trafficMetricNames, [
        { metrics: [10, 8, 20, 40, 12, 0.6, 0.4, 75.5] },
      ]),
      metadata: { timeZone: "Asia/Ho_Chi_Minh" },
    },
    table(["sessionSourceMedium"], breakdown, [
      { dimensions: ["google / organic"], metrics: [5, 7, 15, 0.5, 0.5] },
    ]),
    table(["landingPage"], breakdown, [
      { dimensions: ["/san-pham"], metrics: [4, 5, 10, 0.7, 0.3] },
    ]),
    table(["deviceCategory"], breakdown, [
      { dimensions: ["mobile"], metrics: [8, 12, 20, 0.6, 0.4] },
    ]),
    table(
      ["eventName"],
      ["eventCount", "totalUsers"],
      [{ dimensions: ["order_submitted"], metrics: [2, 1] }],
    ),
  ];
}
function configured() {
  vi.stubEnv("GA_PROPERTY_ID", "123456");
  vi.stubEnv("GA_ACCESS_TOKEN", "server-test-token");
}
function successFetch() {
  mocks.fetch.mockImplementation(async (url: string) => {
    if (url.includes("batchRunReports"))
      return Response.json({ reports: reports() });
    if (url.endsWith(":runReport"))
      return Response.json(
        table(
          ["date"],
          ["totalUsers", "sessions", "screenPageViews"],
          [{ dimensions: ["20261001"], metrics: [5, 8, 11] }],
        ),
      );
    if (url.includes("runRealtimeReport"))
      return Response.json(
        table([], ["activeUsers", "screenPageViews"], [{ metrics: [3, 7] }]),
      );
    return Response.json({
      funnelTable: table(
        ["funnelStepName"],
        ["activeUsers", "funnelStepCompletionRate", "funnelStepAbandonments"],
        [{ dimensions: ["1. view_item"], metrics: [8, 0.5, 4] }],
      ),
    });
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  for (const name of [
    "GA_PROPERTY_ID",
    "GA_ACCESS_TOKEN",
    "GA_SERVICE_ACCOUNT_EMAIL",
    "GA_SERVICE_ACCOUNT_PRIVATE_KEY",
  ])
    vi.stubEnv(name, "");
  mocks.requireAdmin.mockResolvedValue({
    supabase: {
      rpc: vi.fn().mockResolvedValue({
        data: {
          successful_orders: 3,
          attributed_orders: 2,
          landing_revenue: [{ name: "/san-pham", orders: 2, revenue: 240000 }],
          pending_events: 0,
          expired_events: 0,
          uncertain_events: 0,
        },
        error: null,
      }),
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GA4 reports and secure server access", () => {
  it("requires administrator access before checking credentials or querying Google", async () => {
    configured();
    mocks.requireAdmin.mockRejectedValue(new HttpError(403, "Denied"));
    await expect(getAdminTrafficReport(range)).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("reports missing credentials without inventing zero traffic or fetching Google", async () => {
    const result = await getAdminTrafficReport(range);
    expect(result.configured).toBe(false);
    expect(result).not.toHaveProperty("metrics");
    expect(mocks.fetch).not.toHaveBeenCalled();
    const csv = trafficCsv(result);
    expect(csv).toContain("Chưa kết nối quyền đọc");
    expect(csv).not.toContain('"totalUsers","0"');
  });
  it("maps provider values, ledger conversion and complete successful-purchase funnel", async () => {
    configured();
    successFetch();
    const result = await getAdminTrafficReport(range);
    expect(result).toMatchObject({
      configured: true,
      metrics: { totalUsers: 10, sessions: 20, bounceRate: 0.4 },
      realtime: { users: 3, views: 7 },
      pages_per_session: 2,
      successful_order_conversion_rate: 0.15,
      commerce: { successful_orders: 3, attributed_orders: 2 },
      landing_pages: [
        {
          name: "/san-pham",
          bounce_rate: 0.3,
          revenue: 240000,
          successful_orders: 2,
        },
      ],
      sources: [{ name: "google / organic", users: 5 }],
      funnel: [{ name: "1. view_item", users: 8, completion_rate: 0.5 }],
    });
    if (result.configured) {
      expect(result.trend).toHaveLength(9);
      expect(result.trend[0]).toEqual({
        date: "2026-10-01",
        users: 5,
        sessions: 8,
        views: 11,
      });
      expect(result.trend[1]).toEqual({
        date: "2026-10-02",
        users: 0,
        sessions: 0,
        views: 0,
      });
      expect(result.trend.at(-1)?.date).toBe("2026-10-09");
    }
    const batchCall = mocks.fetch.mock.calls.find(([url]) =>
      url.includes("batchRunReports"),
    )!;
    const body = JSON.parse(batchCall[1].body);
    expect(body.requests).toHaveLength(5);
    expect(body.requests[0].dateRanges).toEqual([
      { startDate: range.from, endDate: range.to },
    ]);
    expect(batchCall[1].headers.Authorization).toBe("Bearer server-test-token");
    expect(batchCall[1].cache).toBe("no-store");
    expect(body.requests[2].dimensions).toEqual([{ name: "landingPage" }]);
    const funnelCall = mocks.fetch.mock.calls.find(([url]) =>
      url.includes("runFunnelReport"),
    )!;
    expect(funnelCall[0]).toContain("v1alpha");
    expect(
      JSON.parse(funnelCall[1].body).funnel.steps.map(
        (step: { name: string }) => step.name,
      ),
    ).toEqual([
      "session_start",
      "view_item",
      "add_to_cart",
      "begin_checkout",
      "purchase",
    ]);
    expect(JSON.stringify(body)).toContain('"purchase"');
    expect(JSON.stringify(result)).not.toContain("server-test-token");
  });
  it("keeps core metrics when realtime or the alpha funnel is temporarily unavailable", async () => {
    configured();
    mocks.fetch.mockImplementation(async (url: string) =>
      url.includes("batchRunReports")
        ? Response.json({ reports: reports() })
        : Response.json({}, { status: 503 }),
    );
    const result = await getAdminTrafficReport(range);
    expect(result).toMatchObject({
      configured: true,
      metrics: { sessions: 20 },
      realtime: null,
      funnel: null,
    });
    if (result.configured) {
      expect(result.realtime_error).toBeTruthy();
      expect(result.funnel_error).toBeTruthy();
    }
  });
  it("keeps unknown ledger and auxiliary provider values unavailable instead of reporting zero success", async () => {
    configured();
    successFetch();
    mocks.requireAdmin.mockResolvedValue({
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "missing migration" },
        }),
      },
    });
    const provider = mocks.fetch.getMockImplementation()!;
    mocks.fetch.mockImplementation((url: string, init: RequestInit) =>
      url.includes("batchRunReports")
        ? provider(url, init)
        : Promise.resolve(Response.json({})),
    );
    const report = await getAdminTrafficReport(range);
    expect(report).toMatchObject({
      configured: true,
      commerce: null,
      successful_order_conversion_rate: null,
      realtime: null,
      funnel: null,
      trend: [],
    });
    if (report.configured) {
      expect(report.commerce_error).toBeTruthy();
      expect(report.trend_error).toBeTruthy();
      expect(report.landing_pages[0].revenue).toBeNull();
      expect(trafficCsv(report)).toContain("Chưa đọc được sổ đơn hàng");
    }
  });
  it("exports derived metrics, daily trend, bounce rates and real attributable revenue", async () => {
    configured();
    successFetch();
    const report = await getAdminTrafficReport(range);
    const csv = trafficCsv(report);
    expect(csv).toContain('"Số trang / phiên","2"');
    expect(csv).toContain('"Đơn thành công / phiên GA4","0.15"');
    expect(csv).toContain('"2026-10-01","5","8","11"');
    expect(csv).toContain('"2026-10-02","0","0","0"');
    expect(csv).toContain('"/san-pham","4","5","10","0.7","0.3","240000","2"');
  });
  it.each([401, 403, 429, 500])(
    "returns redacted provider errors for status %i",
    async (status) => {
      configured();
      mocks.fetch.mockResolvedValue(
        Response.json(
          { error: { message: "secret server-test-token" } },
          { status },
        ),
      );
      await expect(getAdminTrafficReport(range)).rejects.toSatisfy(
        (error: Error) =>
          !error.message.includes("secret") &&
          !error.message.includes("server-test-token"),
      );
    },
  );
  it("signs a service-account JWT with only readonly scope and keeps the token on the server", async () => {
    const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
    vi.stubEnv("GA_PROPERTY_ID", "123456");
    vi.stubEnv(
      "GA_SERVICE_ACCOUNT_EMAIL",
      "reports-test@example.iam.gserviceaccount.com",
    );
    vi.stubEnv(
      "GA_SERVICE_ACCOUNT_PRIVATE_KEY",
      keys.privateKey
        .export({ format: "pem", type: "pkcs8" })
        .toString()
        .replaceAll("\n", "\\n"),
    );
    successFetch();
    const provider = mocks.fetch.getMockImplementation()!;
    mocks.fetch.mockImplementation(async (url: string, init: RequestInit) => {
      if (!url.includes("oauth2.googleapis.com")) return provider(url, init);
      const assertion = (init.body as URLSearchParams).get("assertion")!;
      const [header, claims, signature] = assertion.split(".");
      expect(
        verify(
          "RSA-SHA256",
          Buffer.from(`${header}.${claims}`),
          keys.publicKey,
          Buffer.from(signature, "base64url"),
        ),
      ).toBe(true);
      expect(
        JSON.parse(Buffer.from(claims, "base64url").toString()),
      ).toMatchObject({
        scope: "https://www.googleapis.com/auth/analytics.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iss: "reports-test@example.iam.gserviceaccount.com",
      });
      return Response.json({
        access_token: "private-provider-token",
        expires_in: 3600,
      });
    });
    const first = await getAdminTrafficReport(range);
    await getAdminTrafficReport(range);
    expect(
      mocks.fetch.mock.calls.filter(([url]) =>
        url.includes("oauth2.googleapis.com"),
      ),
    ).toHaveLength(1);
    expect(JSON.stringify(first)).not.toContain("private-provider-token");
  });
  it("rejects a partial provider response instead of filling unknown metrics with zeros", async () => {
    configured();
    successFetch();
    mocks.fetch.mockImplementation(async () =>
      Response.json({ reports: [{}, {}, {}, {}, {}] }),
    );
    await expect(getAdminTrafficReport(range)).rejects.toMatchObject({
      status: 502,
    });
  });
  it("rejects invalid dates in the administrator report endpoint", async () => {
    const result = await GET(
      new Request(
        "https://mocbam.test/api/admin/traffic?from=2026-02-30&to=2026-10-01",
      ),
    );
    expect(result.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("preserves provider empty periods and neutralizes CSV formulas", () => {
    const empty = mapTrafficReport(
      reports().map((report) => ({ ...report, rows: [], rowCount: 0 })),
      null,
      null,
      range,
    );
    expect(empty.metrics.totalUsers).toBe(0);
    expect(empty.sources).toEqual([]);
    expect(trafficCsv(empty)).toContain('"totalUsers","0"');
    const populated = mapTrafficReport(reports(), null, null, range);
    populated.sources[0].name = "=HYPERLINK(1)";
    expect(trafficCsv(populated)).toContain('"\'=HYPERLINK(1)"');
  });
  it("zero-fills successful empty daily responses but preserves unknown or thresholded dates", () => {
    const dailyMetrics = ["totalUsers", "sessions", "screenPageViews"];
    const empty = mapTrafficReport(
      reports(),
      null,
      null,
      range,
      table(["date"], dailyMetrics),
    );
    expect(empty.trend).toHaveLength(9);
    expect(
      empty.trend.every(
        (day) => day.users === 0 && day.sessions === 0 && day.views === 0,
      ),
    ).toBe(true);
    expect(mapTrafficReport(reports(), null, null, range, null).trend).toEqual(
      [],
    );
    const protectedDaily = {
      ...table(["date"], dailyMetrics, [
        { dimensions: ["20261001"], metrics: [5, 8, 11] },
      ]),
      metadata: { subjectToThresholding: true },
    };
    expect(
      mapTrafficReport(reports(), null, null, range, protectedDaily).trend,
    ).toEqual([{ date: "2026-10-01", users: 5, sessions: 8, views: 11 }]);
  });
});
