import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminSupportThreads } from "@/lib/support-admin";
import { mergeSupportMessages, type SupportMessage } from "@/lib/support";

const mocks = vi.hoisted(() => ({
  rows: {} as Record<string, Record<string, string | number | boolean>[]>,
  cursor: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireAdmin: async () => ({
    supabase: {
      from: (table: string) => {
        let key = "id";
        let cursor: string | number | undefined;
        let size = 500;
        const query = {
          select: () => query,
          order: (column: string) => {
            key = column;
            return query;
          },
          limit: (limit: number) => {
            size = limit;
            return query;
          },
          gt: (column: string, value: string | number) => {
            mocks.cursor(table, column, value);
            cursor = value;
            return query;
          },
          then: (
            resolve: (value: {
              data: Record<string, string | number | boolean>[];
              error: null;
            }) => unknown,
          ) =>
            resolve({
              data: (mocks.rows[table] || [])
                .filter((row) => cursor === undefined || row[key] > cursor)
                .sort((a, b) =>
                  a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0,
                )
                .slice(0, size),
              error: null,
            }),
        };
        return query;
      },
    },
  }),
}));
beforeEach(() => {
  mocks.rows = {};
  vi.clearAllMocks();
});

const message = (
  id: number,
  sender: SupportMessage["sender"] = "customer",
): SupportMessage => ({
  id,
  user_id: "user",
  sender,
  body: `Message ${id}`,
  created_at: "2026-10-09T00:00:00Z",
});

describe("staff support pagination", () => {
  it("includes every profile/thread and latest messages beyond Supabase's row cap", async () => {
    const total = 1207;
    const user = (index: number) => `user-${String(index).padStart(4, "0")}`;
    mocks.rows.support_threads = Array.from({ length: total }, (_, index) => ({
      user_id: user(index),
      resolved: false,
      updated_at: new Date(Date.UTC(2026, 9, 9, 0, 0, index)).toISOString(),
    }));
    mocks.rows.profiles = Array.from({ length: total }, (_, index) => ({
      id: user(index),
      full_name: `Customer ${index}`,
      email: `${index}@example.invalid`,
      phone: "",
    }));
    mocks.rows.support_messages = Array.from(
      { length: total * 2 },
      (_, index) => ({
        id: index + 1,
        user_id: user(index % total),
        sender: "customer",
        body: `Question ${index + 1}`,
        created_at: "2026-10-09T00:00:00Z",
      }),
    );
    const threads = await getAdminSupportThreads();
    expect(threads).toHaveLength(total);
    expect(threads[0].user_id).toBe(user(total - 1));
    expect(threads[0].profile.full_name).toBe(`Customer ${total - 1}`);
    expect(threads[0].messages.map((item) => item.id)).toEqual([
      total,
      total * 2,
    ]);
    expect(threads.at(-1)?.messages).toHaveLength(2);
    expect(mocks.cursor).toHaveBeenCalledWith(
      "support_threads",
      "user_id",
      user(499),
    );
    expect(mocks.cursor).toHaveBeenCalledWith("profiles", "id", user(999));
    expect(mocks.cursor).toHaveBeenCalledWith("support_messages", "id", 2000);
  });
});

describe("support polling", () => {
  it("retains an acknowledged send when an older poll resolves and merges later staff replies once", () => {
    const acknowledged = [message(1), message(2)];
    const stalePoll = [message(1)];
    expect(mergeSupportMessages(acknowledged, stalePoll)).toEqual(acknowledged);
    const laterPoll = [message(1), message(2), message(3, "staff")];
    expect(
      mergeSupportMessages(acknowledged, laterPoll).map((item) => item.id),
    ).toEqual([1, 2, 3]);
    expect(mergeSupportMessages(laterPoll, stalePoll).at(-1)?.sender).toBe(
      "staff",
    );
  });
  it("keeps the most recent 200 unique messages in order", () => {
    const previous = Array.from({ length: 200 }, (_, index) =>
      message(index + 1),
    );
    const merged = mergeSupportMessages(previous, [message(201), message(199)]);
    expect(merged).toHaveLength(200);
    expect(merged[0].id).toBe(2);
    expect(merged.at(-1)?.id).toBe(201);
  });
});
