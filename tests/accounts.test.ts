import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as emailAuth } from "@/app/auth/email/route";
import { PATCH as updateProfile } from "@/app/api/account/profile/route";
import { GET as accountOrders } from "@/app/api/account/orders/route";
import { GET as receiptOrder } from "@/app/api/orders/[id]/route";
import { digest, tokenForRequest } from "@/lib/supabase/receipts";
import { readSavedOrders, saveOrderReceipt } from "@/lib/saved-orders";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  server: vi.fn(),
  service: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  serviceFrom: vi.fn(),
  serviceUpdate: vi.fn(),
  serviceIs: vi.fn(),
  serviceEq: vi.fn(),
  serviceSelect: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  requireAdmin: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: mocks.server,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceSupabase: mocks.service,
}));

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const stranger = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const token = tokenForRequest(id, "s".repeat(32));
function request(
  path: string,
  body: unknown,
  origin = "http://localhost:3000",
) {
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const register = {
  mode: "register",
  name: "Khách Mẫu",
  email: "BUYER@example.com",
  phone: "0901234567",
  password: "long-password",
  next: "/thanh-toan",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  mocks.getCurrentUser.mockResolvedValue({
    id,
    email: "buyer@example.com",
    email_confirmed_at: "2026-10-01T00:00:00Z",
  });
  const chain = {
    select: mocks.select,
    update: mocks.update,
    eq: mocks.eq,
    order: mocks.order,
    single: mocks.single,
  };
  mocks.from.mockReturnValue(chain);
  mocks.select.mockReturnValue(chain);
  mocks.update.mockReturnValue(chain);
  mocks.eq.mockReturnValue(chain);
  mocks.order.mockResolvedValue({ data: [{ id: "owned-order" }], error: null });
  mocks.single.mockResolvedValue({
    data: { full_name: "Khách Mẫu", phone: "0901234567" },
    error: null,
  });
  mocks.server.mockResolvedValue({
    from: mocks.from,
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
    },
  });
  const serviceChain = {
    update: mocks.serviceUpdate,
    is: mocks.serviceIs,
    eq: mocks.serviceEq,
    select: mocks.serviceSelect,
    maybeSingle: mocks.maybeSingle,
  };
  mocks.serviceFrom.mockReturnValue(serviceChain);
  mocks.serviceUpdate.mockReturnValue(serviceChain);
  mocks.serviceIs.mockReturnValue(serviceChain);
  mocks.serviceSelect.mockReturnValue(serviceChain);
  mocks.serviceEq.mockReturnValue(serviceChain);
  Object.assign(serviceChain, {
    then: (resolve: (value: unknown) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  });
  mocks.service.mockReturnValue({ from: mocks.serviceFrom, rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({ data: 0, error: null });
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  mocks.signInWithPassword.mockResolvedValue({
    data: { session: {} },
    error: null,
  });
  mocks.maybeSingle.mockResolvedValue({
    data: {
      id,
      user_id: stranger,
      guest_access_hash: digest(token),
      payment_method: "cod",
    },
    error: null,
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("email login and customer profile boundaries", () => {
  it("uses normalized email and only validated contact metadata for registration", async () => {
    const response = await emailAuth(request("/auth/email", register));
    expect(response.status).toBe(200);
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "buyer@example.com",
      password: register.password,
      options: {
        data: { full_name: register.name, phone: register.phone },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });
    expect(await response.json()).toMatchObject({
      ok: true,
      confirmation: true,
      next: "/thanh-toan",
    });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it("rejects cross-origin registration before creating an auth client", async () => {
    const response = await emailAuth(
      request("/auth/email", register, "https://other.example"),
    );
    expect(response.status).toBe(403);
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it.each([
    { name: "A" },
    { phone: "not-a-phone" },
    { password: "short" },
    { email: "bad-email" },
  ])("rejects invalid registration values %j", async (override) => {
    const response = await emailAuth(
      request("/auth/email", { ...register, ...override }),
    );
    expect(response.status).toBe(400);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("does not redirect login outside the store", async () => {
    const response = await emailAuth(
      request("/auth/email", {
        mode: "login",
        email: register.email,
        password: register.password,
        next: "https://attacker.example",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ next: "/tai-khoan" });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "buyer@example.com",
      password: register.password,
    });
  });
  it("preserves auth throttling without returning provider error details", async () => {
    mocks.signUp.mockResolvedValue({
      data: {},
      error: { status: 429, message: "Private provider data" },
    });
    const response = await emailAuth(request("/auth/email", register));
    expect(response.status).toBe(429);
    expect(JSON.stringify(await response.json())).not.toContain(
      "Private provider data",
    );
  });
  it("updates only the current user's allowed profile fields even if a submitted owner/email is spoofed", async () => {
    const response = await updateProfile(
      request("/api/account/profile", {
        full_name: "  Tên mới  ",
        phone: "0901234567",
        id: stranger,
        email: "other@example.com",
        role: "admin",
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("profiles");
    expect(mocks.update).toHaveBeenCalledWith({
      full_name: "Tên mới",
      phone: "0901234567",
    });
    expect(mocks.eq).toHaveBeenCalledWith("id", id);
    expect(mocks.select).toHaveBeenCalledWith("full_name,phone");
  });
  it("denies anonymous and cross-origin profile writes before database access", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect(
      (
        await updateProfile(
          request("/api/account/profile", {
            full_name: "Khách",
            phone: register.phone,
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await updateProfile(
          request(
            "/api/account/profile",
            { full_name: "Khách", phone: register.phone },
            "https://other.example",
          ),
        )
      ).status,
    ).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("account and capability-based receipt access", () => {
  it("denies anonymous account-history access before touching either database client", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await accountOrders()).status).toBe(401);
    expect(mocks.service).not.toHaveBeenCalled();
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it.each([null, ""])(
    "does not claim guest orders for unverified email (%j)",
    async (confirmed) => {
      mocks.getCurrentUser.mockResolvedValue({
        id,
        email: "buyer@example.com",
        email_confirmed_at: confirmed,
        user_metadata: {
          email: "victim@example.com",
          email_confirmed_at: "forged",
        },
      });
      expect((await accountOrders()).status).toBe(200);
      expect(mocks.service).not.toHaveBeenCalled();
      expect(mocks.eq).toHaveBeenCalledWith("user_id", id);
    },
  );
  it("recovers only unowned guest orders for the verified auth email", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id,
      email: "BUYER@example.com",
      email_confirmed_at: "2026-10-01T00:00:00Z",
      user_metadata: { email: "victim@example.com" },
    });
    const response = await accountOrders();
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("claim_guest_orders", {
      p_user_id: id,
    });
    expect(mocks.serviceUpdate).not.toHaveBeenCalled();
    expect(mocks.serviceFrom).not.toHaveBeenCalled();
    expect(mocks.eq).toHaveBeenCalledWith("user_id", id);
    expect(await response.json()).toEqual({ orders: [{ id: "owned-order" }] });
  });
  it("does not hide ownership-recovery failures or return partial private history", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "Private database detail" },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await accountOrders();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain(
      "Private database detail",
    );
    expect(mocks.server).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("accepts a valid receipt token after ownership recovery without exposing its hash", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await receiptOrder(
      new Request(`http://localhost:3000/api/orders/${id}?token=${token}`),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.order).not.toHaveProperty("guest_access_hash");
    expect(body.order.user_id).toBe(stranger);
  });
  it("rejects an unrelated signed-in customer knowing the order ID but lacking its receipt token", async () => {
    const response = await receiptOrder(
      new Request(`http://localhost:3000/api/orders/${id}`),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).not.toHaveProperty("order");
  });
  it("lets the order's authenticated owner read it without a receipt token", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: stranger });
    expect(
      (
        await receiptOrder(
          new Request(`http://localhost:3000/api/orders/${id}`),
          { params: Promise.resolve({ id }) },
        )
      ).status,
    ).toBe(200);
  });
});

describe("saved receipt validation", () => {
  it("ignores malformed device storage and retains at most twenty validated capabilities", () => {
    let stored = "not-json";
    vi.stubGlobal("localStorage", {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    });
    expect(readSavedOrders()).toEqual([]);
    stored = JSON.stringify([
      { id, token: "bad", reference: "MB-1" },
      null,
      { id, token, reference: "MB-1" },
    ]);
    expect(readSavedOrders()).toEqual([{ id, token, reference: "MB-1" }]);
    for (let i = 0; i < 25; i++)
      saveOrderReceipt({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`,
        token,
        reference: `MB-${i}`,
      });
    expect(readSavedOrders()).toHaveLength(20);
    expect(readSavedOrders()[0].reference).toBe("MB-24");
  });
});
