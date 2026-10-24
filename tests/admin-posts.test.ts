import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "@/app/api/admin/[collection]/[id]/route";
import { HttpError } from "@/lib/http";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  service: vi.fn(),
  from: vi.fn(),
  chain: vi.fn(),
  single: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceSupabase: mocks.service,
}));
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const context = { params: Promise.resolve({ collection: "posts", id }) };
function request(
  method: "DELETE" | "PATCH",
  body?: unknown,
  origin = "http://localhost:3000",
) {
  return new Request(`http://localhost:3000/api/admin/posts/${id}`, {
    method,
    headers: { origin, "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  const chain = {
    delete: mocks.chain,
    update: mocks.chain,
    eq: mocks.chain,
    select: mocks.chain,
    maybeSingle: mocks.single,
  };
  mocks.chain.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
  mocks.single.mockResolvedValue({ data: { id }, error: null });
  mocks.service.mockReturnValue({ from: mocks.from });
  mocks.admin.mockResolvedValue({ supabase: { from: mocks.from } });
});

describe("deleting blog posts", () => {
  it("checks origin and administrator access before using the server key", async () => {
    expect(
      (
        await DELETE(
          request("DELETE", undefined, "https://elsewhere.example"),
          context,
        )
      ).status,
    ).toBe(403);
    mocks.admin.mockRejectedValue(new HttpError(403, "Không có quyền"));
    expect((await DELETE(request("DELETE"), context)).status).toBe(403);
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it("deletes exactly the requested post and reports a missing one", async () => {
    const response = await DELETE(request("DELETE"), context);
    expect(response.status).toBe(200);
    expect(mocks.from).toHaveBeenCalledWith("posts");
    expect(mocks.chain).toHaveBeenCalledWith("id", id);
    mocks.single.mockResolvedValue({ data: null, error: null });
    expect((await DELETE(request("DELETE"), context)).status).toBe(404);
    expect(
      (
        await DELETE(request("DELETE"), {
          params: Promise.resolve({ collection: "posts", id: "not-a-uuid" }),
        })
      ).status,
    ).toBe(400);
  });

  it("lets the administrator move a post's date", async () => {
    const response = await PATCH(
      request("PATCH", { created_at: "2025-06-01T03:00:00.000Z" }),
      context,
    );
    expect(response.status).toBe(200);
    expect(mocks.chain).toHaveBeenCalledWith({
      created_at: "2025-06-01T03:00:00.000Z",
    });
  });
});

describe("locked post dates", () => {
  it("refuses date changes once the switch is off", async () => {
    vi.resetModules();
    vi.doMock("@/lib/features", () => ({ postDateEditable: false }));
    const route = await import("@/app/api/admin/[collection]/[id]/route");
    const response = await route.PATCH(
      request("PATCH", { created_at: "2025-06-01T03:00:00.000Z" }),
      context,
    );
    expect(response.status).toBe(400);
    expect(mocks.chain).not.toHaveBeenCalledWith(
      expect.objectContaining({ created_at: expect.anything() }),
    );
    vi.doUnmock("@/lib/features");
  });
});
