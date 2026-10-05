import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as resend } from "@/app/auth/resend/route";
import { GET as confirm } from "@/app/auth/confirm/route";

const mocks = vi.hoisted(() => ({
  server: vi.fn(),
  resend: vi.fn(),
  verifyOtp: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: mocks.server,
}));
const request = (email: string, origin = "https://mocbam.vercel.app") =>
  new Request("https://mocbam.vercel.app/auth/resend", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mocbam.vercel.app");
  mocks.server.mockResolvedValue({
    auth: { resend: mocks.resend, verifyOtp: mocks.verifyOtp },
  });
  mocks.resend.mockResolvedValue({ error: null });
  mocks.verifyOtp.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("confirmation resend", () => {
  it("normalizes email and uses the canonical callback", async () => {
    expect((await resend(request("  BUYER@example.com  "))).status).toBe(200);
    expect(mocks.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "buyer@example.com",
      options: { emailRedirectTo: "https://mocbam.vercel.app/auth/callback" },
    });
  });
  it("rejects foreign origins before contacting Supabase", async () => {
    expect(
      (await resend(request("buyer@example.com", "https://other.example")))
        .status,
    ).toBe(403);
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it.each(["invalid", "", "a".repeat(255) + "@example.com"])(
    "rejects invalid email %s",
    async (email) => {
      expect((await resend(request(email))).status).toBe(400);
      expect(mocks.resend).not.toHaveBeenCalled();
    },
  );
  it("preserves throttling without exposing provider details", async () => {
    mocks.resend.mockResolvedValue({
      error: { status: 429, message: "secret provider message" },
    });
    const r = await resend(request("buyer@example.com"));
    expect(r.status).toBe(429);
    expect(await r.text()).not.toContain("secret provider");
  });
  it("does not disclose whether the account exists", async () => {
    mocks.resend.mockResolvedValue({
      error: { status: 400, code: "user_not_found" },
    });
    expect(await (await resend(request("buyer@example.com"))).json()).toEqual({
      ok: true,
    });
  });
  it("reports SMTP failures without claiming email was sent", async () => {
    mocks.resend.mockResolvedValue({
      error: { status: 500, message: "smtp credential rejected" },
    });
    const r = await resend(request("buyer@example.com"));
    expect(r.status).toBe(503);
    expect(await r.text()).not.toContain("credential");
  });
});
describe("email confirmation links", () => {
  it("establishes the session and shows a confirmation success state", async () => {
    const r = await confirm(
      new Request(
        "https://mocbam.vercel.app/auth/confirm?token_hash=example&type=email",
      ),
    );
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "example",
      type: "email",
    });
    expect(r.headers.get("location")).toBe(
      "https://mocbam.vercel.app/tai-khoan?confirmed=1",
    );
  });
  it("blocks an external next destination", async () => {
    const r = await confirm(
      new Request(
        "https://mocbam.vercel.app/auth/confirm?token_hash=example&type=email&next=https://attacker.example",
      ),
    );
    expect(r.headers.get("location")).toBe(
      "https://mocbam.vercel.app/tai-khoan?confirmed=1",
    );
  });
  it("provides the expired-link state", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const r = await confirm(
      new Request(
        "https://mocbam.vercel.app/auth/confirm?token_hash=example&type=email",
      ),
    );
    expect(r.headers.get("location")).toBe(
      "https://mocbam.vercel.app/tai-khoan?error=confirmation",
    );
  });
  it("rejects unsupported confirmation types without consuming a token", async () => {
    await confirm(
      new Request(
        "https://mocbam.vercel.app/auth/confirm?token_hash=example&type=recovery",
      ),
    );
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });
});
