import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, DELETE } from "@/app/api/admin/[collection]/[id]/route";
import { HttpError } from "@/lib/http";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin }));
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const context = { params: Promise.resolve({ collection: "products", id }) };
const url = `http://localhost:3000/api/admin/products/${id}`;
function request(
  method: "PATCH" | "DELETE",
  body?: unknown,
  origin = "http://localhost:3000",
) {
  return new Request(url, {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  const chain = {
    update: mocks.update,
    delete: mocks.remove,
    eq: mocks.eq,
    select: mocks.select,
    maybeSingle: mocks.single,
    limit: mocks.limit,
  };
  for (const mock of [
    mocks.from,
    mocks.update,
    mocks.remove,
    mocks.eq,
    mocks.select,
  ])
    mock.mockReturnValue(chain);
  mocks.single.mockResolvedValue({ data: { id }, error: null });
  mocks.limit.mockResolvedValue({ data: [], error: null });
  mocks.admin.mockResolvedValue({ supabase: { from: mocks.from } });
});
afterEach(() => vi.unstubAllEnvs());

describe("protected product mutations", () => {
  it("checks origin and administrator access before any deletion", async () => {
    expect(
      (
        await DELETE(
          request("DELETE", undefined, "https://elsewhere.example"),
          context,
        )
      ).status,
    ).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
    mocks.admin.mockRejectedValue(new HttpError(401, "Sign in"));
    expect((await DELETE(request("DELETE"), context)).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("requires the product revision and atomically rejects stale inventory edits", async () => {
    expect((await PATCH(request("PATCH", { stock: 10 }), context)).status).toBe(
      400,
    );
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.single.mockResolvedValue({ data: null, error: null });
    expect(
      (
        await PATCH(
          request("PATCH", { stock: 10, expected_revision: 7 }),
          context,
        )
      ).status,
    ).toBe(409);
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ stock: 10 });
    expect(mocks.eq).toHaveBeenCalledWith("revision", 7);
  });
  it("keeps products referenced by historical orders", async () => {
    mocks.limit.mockResolvedValue({
      data: [{ id: "historical-item" }],
      error: null,
    });
    const response = await DELETE(request("DELETE"), context);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("ẩn sản phẩm");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("allows unused-product deletion and handles an order created during the check", async () => {
    expect((await DELETE(request("DELETE"), context)).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledOnce();
    mocks.single.mockResolvedValue({
      data: null,
      error: { code: "23503", message: "Foreign key" },
    });
    expect((await DELETE(request("DELETE"), context)).status).toBe(409);
  });
});
