import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/discounts/[id]/email/route";
import { HttpError } from "@/lib/http";
import type { VoucherEmailDelivery } from "@/lib/voucher-email";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  service: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  configured: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceSupabase: mocks.service,
}));
vi.mock("@/lib/email-server", async (original) => ({
  ...(await original<typeof import("@/lib/email-server")>()),
  voucherEmailConfigured: mocks.configured,
  createVoucherMailer: () => {
    if (!mocks.configured()) throw new HttpError(503, "SMTP chưa cấu hình");
    return { send: mocks.send, close: mocks.close };
  },
}));
const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const buyer = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const voucher = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const key = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const base = {
  idempotency_key: key,
  recipient_user_ids: [buyer],
  subject: "Chào {ten_khach}",
  body: "Ưu đãi cho {email}",
};
const context = { params: Promise.resolve({ id: voucher }) };
const request = (body: unknown = base, origin = "http://localhost:3000") =>
  new Request(`http://localhost:3000/api/admin/discounts/${voucher}/email`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
let deliveries: VoucherEmailDelivery[];
let storedHash: string | null;
let rpc: ReturnType<typeof vi.fn>;

function service() {
  return {
    rpc,
    from(table: string) {
      if (table === "discounts")
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: voucher,
                  code: "PRIVATE7",
                  kind: "fixed",
                  value: 7000,
                  min_subtotal: 0,
                  max_discount: null,
                  starts_at: null,
                  ends_at: null,
                },
                error: null,
              }),
            }),
          }),
        };
      let changes: Partial<VoucherEmailDelivery> | null = null;
      const filters: [string, unknown][] = [];
      const execute = () => {
        const matched = deliveries.filter((row) =>
          filters.every(
            ([name, value]) =>
              name === "campaign_id" ||
              row[name as keyof VoucherEmailDelivery] === value,
          ),
        );
        if (changes) matched.forEach((row) => Object.assign(row, changes));
        return { data: matched.map((row) => ({ ...row })), error: null };
      };
      const builder = {
        select: () => builder,
        eq: (name: string, value: unknown) => {
          filters.push([name, value]);
          return builder;
        },
        update: (values: Partial<VoucherEmailDelivery>) => {
          changes = values;
          return builder;
        },
        maybeSingle: async () => {
          const result = execute();
          return { ...result, data: result.data[0] ?? null };
        },
        then: (resolve: (value: ReturnType<typeof execute>) => unknown) =>
          Promise.resolve(execute()).then(resolve),
      };
      return builder;
    },
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  deliveries = [];
  storedHash = null;
  rpc = vi.fn(async (_name: string, input: Record<string, unknown>) => {
    if (storedHash && storedHash !== input.p_payload_hash)
      return { error: { message: "EMAIL_IDEMPOTENCY_CONFLICT" } };
    if (!storedHash) {
      storedHash = input.p_payload_hash as string;
      deliveries.push({
        id: "delivery-one",
        recipient_user_id: buyer,
        recipient_email: "verified-auth@example.invalid",
        recipient_name: "Mộc",
        status: "pending",
        error_message: "",
        sent_at: null,
      });
    }
    return { data: input.p_id, error: null };
  });
  mocks.admin.mockResolvedValue({ user: { id: admin }, supabase: {} });
  mocks.service.mockImplementation(service);
  mocks.configured.mockReturnValue(true);
  mocks.send.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("admin voucher email endpoint", () => {
  it("rejects customer/cross-site sends before touching the outbox or SMTP", async () => {
    expect(
      (await POST(request(base, "https://attacker.example"), context)).status,
    ).toBe(403);
    mocks.admin.mockRejectedValue(new HttpError(403, "Không có quyền"));
    expect((await POST(request(), context)).status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it("requires SMTP and rejects browser-supplied addresses/header injection", async () => {
    mocks.configured.mockReturnValue(false);
    expect((await POST(request(), context)).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
    mocks.configured.mockReturnValue(true);
    for (const body of [
      { ...base, to: "victim@example.invalid" },
      { ...base, subject: "Hello\r\nBcc: victim@example.invalid" },
    ])
      expect((await POST(request(body), context)).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("sends personalized plain text only to the database-resolved address and adds actual terms", async () => {
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "verified-auth@example.invalid",
        subject: "Chào Mộc",
        text: expect.stringContaining("PRIVATE7"),
        deliveryId: "delivery-one",
      }),
    );
    expect(mocks.send.mock.calls[0][0].text).toContain(
      "Ưu đãi cho verified-auth@example.invalid",
    );
    expect((await response.json()).deliveries[0]).toMatchObject({
      status: "sent",
      error_message: "",
    });
    expect(rpc).toHaveBeenCalledWith(
      "prepare_voucher_email",
      expect.objectContaining({
        p_admin_id: admin,
        p_recipient_user_ids: [buyer],
      }),
    );
  });

  it("claims atomically across simultaneous double-click requests and later retries", async () => {
    const responses = await Promise.all([
      POST(request(), context),
      POST(request(), context),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    await POST(request(), context);
    expect(mocks.send).toHaveBeenCalledOnce();
    const changed = await POST(
      request({ ...base, body: "Different campaign content" }),
      context,
    );
    expect(changed.status).toBe(409);
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("records a provider failure without leaking its raw response and never sends it again on retry", async () => {
    mocks.send.mockRejectedValue(
      Object.assign(new Error("password-or-provider-secret"), {
        responseCode: 550,
      }),
    );
    const response = await POST(request(), context);
    const payload = await response.json();
    expect(payload.deliveries[0]).toMatchObject({ status: "failed" });
    expect(JSON.stringify(payload)).not.toContain(
      "password-or-provider-secret",
    );
    await POST(request(), context);
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("preserves uncertain SMTP outcomes instead of risking another copy", async () => {
    mocks.send.mockRejectedValue(
      Object.assign(new Error("timeout after DATA"), { code: "ETIMEDOUT" }),
    );
    const response = await POST(request(), context);
    expect((await response.json()).deliveries[0].status).toBe("unknown");
    await POST(request(), context);
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("limits delivery history to authorized admins", async () => {
    mocks.admin.mockRejectedValue(new HttpError(401, "Vui lòng đăng nhập"));
    expect(
      (await GET(new Request("http://localhost:3000"), context)).status,
    ).toBe(401);
    mocks.admin.mockResolvedValue({
      user: { id: admin },
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({ limit: async () => ({ data: [], error: null }) }),
            }),
          }),
        }),
      },
    });
    const response = await GET(new Request("http://localhost:3000"), context);
    expect(await response.json()).toEqual({ configured: true, campaigns: [] });
  });
});
