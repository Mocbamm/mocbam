import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boundedHistory, chatHistorySchema } from "@/lib/chat-history";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  from: vi.fn(),
  save: vi.fn(),
  load: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({ from: mocks.from }),
}));
import { GET, PUT } from "@/app/api/account/chat/route";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const send = (body: unknown, origin = "http://localhost:3000") =>
  PUT(
    new Request("http://localhost:3000/api/account/chat", {
      method: "PUT",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  mocks.user.mockResolvedValue({ id: userId });
  mocks.load.mockResolvedValue({
    data: { messages: [{ from: "you", text: "Câu hỏi cũ" }] },
    error: null,
  });
  mocks.save.mockResolvedValue({ error: null });
  const query = {
    select: () => query,
    eq: vi.fn(() => query),
    maybeSingle: mocks.load,
    upsert: mocks.save,
  };
  mocks.from.mockReturnValue(query);
});
afterEach(() => vi.unstubAllEnvs());

describe("account chat storage", () => {
  it("requires authentication before reading or writing history", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await send({ messages: [] })).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("uses the authenticated account ID and rejects a submitted owner", async () => {
    const messages = [{ from: "you", text: "Câu hỏi của tôi" }];
    expect((await send({ messages })).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: userId, messages }),
    );
    expect((await send({ user_id: "someone-else", messages })).status).toBe(
      400,
    );
    expect(mocks.save).toHaveBeenCalledTimes(1);
    const response = await GET();
    expect(await response.json()).toEqual({
      messages: [{ from: "you", text: "Câu hỏi cũ" }],
    });
    expect(mocks.from.mock.results[0].value.eq).toHaveBeenCalledWith(
      "user_id",
      userId,
    );
  });
  it("rejects cross-site writes, invalid messages and oversized Unicode histories", async () => {
    expect((await send({ messages: [] }, "https://other.example")).status).toBe(
      403,
    );
    expect(
      (await send({ messages: [{ from: "admin", text: "x" }] })).status,
    ).toBe(400);
    const messages = Array.from({ length: 100 }, () => ({
      from: "you" as const,
      text: "木".repeat(1000),
    }));
    expect(chatHistorySchema.safeParse({ messages }).success).toBe(false);
    const bounded = boundedHistory(messages);
    expect(bounded.length).toBeLessThan(100);
    expect(chatHistorySchema.safeParse({ messages: bounded }).success).toBe(
      true,
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
