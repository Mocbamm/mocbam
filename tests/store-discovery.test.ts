import { describe, expect, it } from "vitest";
import {
  filterPostsByDate,
  matchesSearch,
  storeDate,
} from "../src/lib/store-discovery";
import type { BlogPost } from "../src/lib/types";

describe("store discovery", () => {
  it("matches Vietnamese terms regardless of accents and requires every query word", () => {
    expect(matchesSearch("Mèo Mộc — được làm từ gỗ", "meo go")).toBe(true);
    expect(matchesSearch("Đồ gỗ cho góc bàn", "do go")).toBe(true);
    expect(matchesSearch("Mèo Mộc — được làm từ gỗ", "meo chuoi")).toBe(false);
    expect(matchesSearch("Mèo Mộc", "   ")).toBe(false);
  });

  it("filters inclusively by the same local day displayed to customers", () => {
    const posts = [
      { id: "before", created_at: "2026-10-02T16:59:59Z" },
      { id: "first", created_at: "2026-10-02T17:00:00Z" },
      { id: "last", created_at: "2026-10-03T16:59:59Z" },
      { id: "after", created_at: "2026-10-03T17:00:00Z" },
    ] as BlogPost[];
    expect(storeDate(posts[1].created_at)).toBe("2026-10-03");
    expect(
      filterPostsByDate(posts, "2026-10-03", "2026-10-03").map(
        (post) => post.id,
      ),
    ).toEqual(["first", "last"]);
    expect(
      filterPostsByDate(posts, "", "2026-10-03").map((post) => post.id),
    ).toEqual(["before", "first", "last"]);
  });
});
