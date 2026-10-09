// Server only: native crypto and read credentials must never enter a client bundle.
import { sign } from "node:crypto";
import { requireAdmin } from "./auth";
import { HttpError } from "./http";
import {
  mapTrafficReport,
  trafficMetricNames,
  type GaTable,
  type TrafficState,
} from "./traffic-reports";
import { type ReportRange } from "./store-reports";

const oauthEndpoint = "https://oauth2.googleapis.com/token";
let cachedToken: { email: string; token: string; expires: number } | null =
  null;
export function gaReadConfigured() {
  return (
    /^\d+$/.test(process.env.GA_PROPERTY_ID ?? "") &&
    Boolean(
      process.env.GA_ACCESS_TOKEN ||
        (process.env.GA_SERVICE_ACCOUNT_EMAIL &&
          process.env.GA_SERVICE_ACCOUNT_PRIVATE_KEY),
    )
  );
}
async function accessToken() {
  if (process.env.GA_ACCESS_TOKEN) return process.env.GA_ACCESS_TOKEN;
  const email = process.env.GA_SERVICE_ACCOUNT_EMAIL!;
  if (cachedToken?.email === email && cachedToken.expires > Date.now() + 60_000)
    return cachedToken.token;
  const issued = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const content = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: oauthEndpoint, iat: issued, exp: issued + 3600 })}`;
  let assertion: string;
  try {
    assertion = `${content}.${sign("RSA-SHA256", Buffer.from(content), process.env.GA_SERVICE_ACCOUNT_PRIVATE_KEY!.replaceAll("\\n", "\n")).toString("base64url")}`;
  } catch {
    throw new HttpError(
      503,
      "Khóa truy cập báo cáo Google Analytics chưa hợp lệ. Kiểm tra cấu hình máy chủ.",
    );
  }
  const response = await fetch(oauthEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new HttpError(
      503,
      "Google Analytics chưa cấp quyền đọc báo cáo cho máy chủ. Kiểm tra tài khoản dịch vụ và quyền Viewer của thuộc tính.",
    );
  const token = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!token.access_token)
    throw new HttpError(
      502,
      "Google Analytics chưa trả về quyền truy cập hợp lệ.",
    );
  cachedToken = {
    email,
    token: token.access_token,
    expires:
      Date.now() +
      Math.min(3600, Math.max(0, Number(token.expires_in) || 0)) * 1000,
  };
  return token.access_token;
}
async function googleReport<T>(
  token: string,
  method: string,
  body: unknown,
  alpha = false,
): Promise<T> {
  const response = await fetch(
    `https://analyticsdata.googleapis.com/${alpha ? "v1alpha" : "v1beta"}/properties/${process.env.GA_PROPERTY_ID}:${method}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new HttpError(
        503,
        "Nguồn GA4 từ chối quyền đọc. Kiểm tra Google Analytics Data API và quyền Viewer của tài khoản dịch vụ.",
      );
    if (response.status === 429)
      throw new HttpError(
        503,
        "Google Analytics tạm hết hạn mức báo cáo. Vui lòng thử lại sau.",
      );
    throw new HttpError(
      502,
      "Chưa thể đọc báo cáo Google Analytics. Vui lòng thử lại sau.",
    );
  }
  return response.json() as Promise<T>;
}
export async function getAdminTrafficReport(
  range: ReportRange,
): Promise<TrafficState> {
  await requireAdmin();
  if (!gaReadConfigured())
    return {
      configured: false,
      range,
      reason:
        "Chưa kết nối quyền đọc báo cáo GA4. Cấu hình ID thuộc tính và tài khoản dịch vụ có quyền Viewer trên máy chủ; mã theo dõi công khai không cấp quyền đọc dữ liệu.",
    };
  try {
    const token = await accessToken();
    const dateRanges = [{ startDate: range.from, endDate: range.to }];
    const report = (
      dimensions: string[],
      metrics: readonly string[],
      limit = "100",
    ) => ({
      dateRanges,
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      limit,
      ...(dimensions.length
        ? { orderBys: [{ metric: { metricName: metrics[0] }, desc: true }] }
        : {}),
    });
    const breakdownMetrics = [
      "totalUsers",
      "sessions",
      "screenPageViews",
      "engagementRate",
    ];
    const requests = [
      report([], trafficMetricNames, "1"),
      report(["sessionSourceMedium"], breakdownMetrics),
      report(["landingPage"], breakdownMetrics),
      report(["deviceCategory"], breakdownMetrics, "20"),
      {
        ...report(["eventName"], ["eventCount", "totalUsers"]),
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: {
              values: [
                "view_item",
                "add_to_cart",
                "begin_checkout",
                "order_submitted",
              ],
              caseSensitive: true,
            },
          },
        },
      },
    ];
    const [batch, live, funnel] = await Promise.all([
      googleReport<{ reports?: GaTable[] }>(token, "batchRunReports", {
        requests,
      }),
      googleReport<GaTable>(token, "runRealtimeReport", {
        metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      }).then(
        (data) => ({ data, error: null }),
        () => ({
          data: null,
          error:
            "Dữ liệu thời gian thực tạm chưa đọc được; báo cáo theo ngày vẫn có hiệu lực.",
        }),
      ),
      googleReport<{ funnelTable?: GaTable }>(
        token,
        "runFunnelReport",
        {
          dateRanges,
          funnel: {
            isOpenFunnel: false,
            steps: [
              "view_item",
              "add_to_cart",
              "begin_checkout",
              "order_submitted",
            ].map((name) => ({
              name,
              filterExpression: { funnelEventFilter: { eventName: name } },
            })),
          },
          limit: "10",
        },
        true,
      ).then(
        (data) => ({
          data: data.funnelTable ?? null,
          error: data.funnelTable ? null : "GA4 chưa trả về báo cáo phễu.",
        }),
        () => ({
          data: null,
          error:
            "Phễu tuần tự GA4 tạm chưa đọc được. Số liệu sự kiện riêng vẫn hiển thị bên dưới.",
        }),
      ),
    ]);
    if (
      batch.reports?.length !== 5 ||
      requests.some((request, index) =>
        request.metrics.some(
          (metric) =>
            !batch.reports?.[index].metricHeaders?.some(
              (header) => header.name === metric.name,
            ),
        ),
      )
    )
      throw new HttpError(
        502,
        "Google Analytics trả về báo cáo chưa đầy đủ. Vui lòng thử lại.",
      );
    const result = mapTrafficReport(
      batch.reports,
      live.data,
      funnel.data,
      range,
    );
    result.realtime_error = live.error;
    result.funnel_error = funnel.error;
    return result;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(
      502,
      "Kết nối báo cáo Google Analytics tạm gián đoạn. Vui lòng thử lại.",
    );
  }
}
