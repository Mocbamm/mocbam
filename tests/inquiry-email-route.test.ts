import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/admin/inquiries/[id]/replies/route";
import { HttpError } from "@/lib/http";
import type { InquiryEmailReply } from "@/lib/inquiry-email";

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
  storeEmailConfigured: mocks.configured,
  createInquiryMailer: () => {
    if (!mocks.configured()) throw new HttpError(503, "SMTP chưa cấu hình");
    return { send: mocks.send, close: mocks.close };
  },
}));
const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const inquiry = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const key = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const base = {
  idempotency_key: key,
  subject: "Mộc phản hồi",
  body: "Chào bạn, đây là phản hồi của Mộc.",
};
const context = { params: Promise.resolve({ id: inquiry }) };
const request = (body: unknown = base, origin = "http://localhost:3000") =>
  new Request(`http://localhost:3000/api/admin/inquiries/${inquiry}/replies`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
let replies: InquiryEmailReply[];
let hash: string | null;
let rpc: ReturnType<typeof vi.fn>;
function service() {
  return {
    rpc,
    from() {
      const filters: [string, unknown][] = [];
      let changes: Partial<InquiryEmailReply> | null = null;
      const execute = () => {
        const matched = replies.filter((reply) =>
          filters.every(
            ([name, value]) => reply[name as keyof InquiryEmailReply] === value,
          ),
        );
        if (changes) matched.forEach((reply) => Object.assign(reply, changes));
        return { data: matched.map((reply) => ({ ...reply })), error: null };
      };
      const builder = {
        select: () => builder,
        eq: (name: string, value: unknown) => {
          filters.push([name, value]);
          return builder;
        },
        update: (value: Partial<InquiryEmailReply>) => {
          changes = value;
          return builder;
        },
        single: async () => {
          const result = execute();
          return { ...result, data: result.data[0] };
        },
        maybeSingle: async () => {
          const result = execute();
          return { ...result, data: result.data[0] ?? null };
        },
        order: () => builder,
        limit: async () => execute(),
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
  replies = [];
  hash = null;
  rpc = vi.fn(async (_name: string, input: Record<string, unknown>) => {
    if (hash && hash !== input.p_payload_hash)
      return { error: { message: "EMAIL_IDEMPOTENCY_CONFLICT" } };
    if (!hash) {
      hash = input.p_payload_hash as string;
      replies.push({
        id: input.p_id as string,
        inquiry_id: inquiry,
        recipient_email: "stored-inquiry@example.invalid",
        subject: input.p_subject as string,
        body: input.p_body as string,
        status: "pending",
        error_message: "",
        created_at: "2026-10-10T00:00:00Z",
        sent_at: null,
      });
    }
    return { data: input.p_id, error: null };
  });
  mocks.configured.mockReturnValue(true);
  mocks.admin.mockResolvedValue({ user: { id: admin }, supabase: service() });
  mocks.service.mockImplementation(service);
  mocks.send.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe("admin inquiry email replies", () => {
  it("rejects unauthenticated/customer/cross-origin sends before database or SMTP", async () => {
    expect(
      (await POST(request(base, "https://attacker.example"), context)).status,
    ).toBe(403);
    for (const status of [401, 403]) {
      mocks.admin.mockRejectedValue(new HttpError(status, "Không có quyền"));
      expect((await POST(request(), context)).status).toBe(status);
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("sends the stored reply to the stored inquiry address and records acceptance", async () => {
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith({
      to: "stored-inquiry@example.invalid",
      subject: base.subject,
      text: base.body,
      deliveryId: key,
    });
    expect((await response.json()).reply.status).toBe("sent");
    expect(rpc).toHaveBeenCalledWith(
      "prepare_inquiry_email",
      expect.objectContaining({ p_admin_id: admin, p_inquiry_id: inquiry }),
    );
  });
  it("does not permit arbitrary recipients or email-header injection", async () => {
    for (const body of [
      { ...base, to: "someone@example.invalid" },
      { ...base, subject: "Hello\nBcc: someone@example.invalid" },
      { ...base, body: "\u0000" },
    ])
      expect((await POST(request(body), context)).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("requires SMTP configuration before reserving an outbox attempt", async () => {
    mocks.configured.mockReturnValue(false);
    expect((await POST(request(), context)).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("claims atomically across concurrent requests and suppresses later retries", async () => {
    const responses = await Promise.all([
      POST(request(), context),
      POST(request(), context),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    await POST(request(), context);
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(
      (await POST(request({ ...base, body: "Different reply" }), context))
        .status,
    ).toBe(409);
    expect(mocks.send).toHaveBeenCalledOnce();
  });
  it("records definite rejections and ambiguous timeouts without leaking raw provider errors or retrying", async () => {
    for (const failure of [
      { responseCode: 550, expected: "failed" },
      { code: "ETIMEDOUT", expected: "unknown" },
    ]) {
      replies = [];
      hash = null;
      mocks.send.mockClear();
      mocks.send.mockRejectedValue(
        Object.assign(new Error("provider-secret"), failure),
      );
      const response = await POST(request(), context);
      const payload = await response.json();
      expect(payload.reply.status).toBe(failure.expected);
      expect(JSON.stringify(payload)).not.toContain("provider-secret");
      await POST(request(), context);
      expect(mocks.send).toHaveBeenCalledOnce();
    }
  });
  it("returns admin-only history and its truthful configuration state", async () => {
    await POST(request(), context);
    const response = await GET(new Request("http://localhost:3000"), context);
    expect(await response.json()).toMatchObject({
      configured: true,
      replies: [{ subject: base.subject, status: "sent" }],
    });
    mocks.admin.mockRejectedValue(new HttpError(403, "Không có quyền"));
    expect(
      (await GET(new Request("http://localhost:3000"), context)).status,
    ).toBe(403);
  });
});
