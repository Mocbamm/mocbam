import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/lib/http";
import { POST as upload } from "@/app/api/admin/upload/route";
import { GET as media } from "@/app/api/media/[path]/route";

const mocks = vi.hoisted(() => ({
  admin: false,
  published: false,
  upload: vi.fn(),
  download: vi.fn(),
  filter: vi.fn(),
  post: null as null | {
    image_url: string;
    video_url: string;
    content: string;
  },
  content: null as null | { content: string },
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(async () => null),
  isAdmin: vi.fn(async () => mocks.admin),
  requireAdmin: vi.fn(async () => {
    if (!mocks.admin)
      throw new HttpError(403, "Tài khoản không có quyền quản trị.");
    return {
      supabase: { storage: { from: () => ({ upload: mocks.upload }) } },
    };
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceSupabase: () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        like: () => query,
        or: (filter: string) => {
          mocks.filter(filter);
          return query;
        },
        limit: async () => ({
          data:
            table === "products" && mocks.published
              ? [{ id: "product" }]
              : table === "posts" && mocks.post
                ? [mocks.post]
                : table === "site_content" && mocks.content
                  ? [mocks.content]
                  : [],
          error: null,
        }),
      };
      return query;
    },
    storage: { from: () => ({ download: mocks.download }) },
  }),
}));
const path = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.mp4";
const params = { params: Promise.resolve({ path }) };
function uploadRequest(file: File, contentLength?: string) {
  const form = new FormData();
  form.set("file", file);
  return new Request("http://localhost:3000/api/admin/upload", {
    method: "POST",
    body: form,
    headers: {
      origin: "http://localhost:3000",
      ...(contentLength ? { "content-length": contentLength } : {}),
    },
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.admin = false;
  mocks.published = false;
  mocks.post = null;
  mocks.content = null;
  mocks.upload.mockResolvedValue({ error: null });
  mocks.download.mockResolvedValue({
    data: new Blob(["0123456789"], { type: "video/mp4" }),
    error: null,
  });
});

describe("product media privacy and seeking", () => {
  it("allows published post videos and body media, plus saved site content media", async () => {
    const url = `/api/media/${path}`;
    for (const post of [
      { image_url: "", video_url: url, content: "Texte" },
      {
        image_url: "",
        video_url: "",
        content: `Texte\n\n@[Fabrication](${url})`,
      },
    ]) {
      mocks.post = post;
      expect(
        (await media(new Request(`http://localhost:3000${url}`), params))
          .status,
      ).toBe(200);
    }
    mocks.post = null;
    for (const content of [url, `@[Fabrication](${url})`]) {
      mocks.content = { content };
      expect(
        (await media(new Request(`http://localhost:3000${url}`), params))
          .status,
      ).toBe(200);
    }
    mocks.content = {
      content: `A plain mention ${url} is not a published media block.`,
    };
    expect(
      (await media(new Request(`http://localhost:3000${url}`), params)).status,
    ).toBe(404);
  });
  it("hides an unattached file without reading storage and checks all published product media fields", async () => {
    const response = await media(
      new Request(`http://localhost:3000/api/media/${path}`),
      params,
    );
    expect(response.status).toBe(404);
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.filter).toHaveBeenCalledWith(
      expect.stringContaining(`image_urls.cs.{/api/media/${path}}`),
    );
    expect(mocks.filter).toHaveBeenCalledWith(
      expect.stringContaining(`video_url.eq./api/media/${path}`),
    );
  });
  it("returns bounded video ranges and suffix ranges after publication", async () => {
    mocks.published = true;
    const response = await media(
      new Request(`http://localhost:3000/api/media/${path}`, {
        headers: { range: "bytes=2-5" },
      }),
      params,
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe("2345");
    const suffix = await media(
      new Request(`http://localhost:3000/api/media/${path}`, {
        headers: { range: "bytes=-3" },
      }),
      params,
    );
    expect(await suffix.text()).toBe("789");
  });
  it("rejects invalid byte ranges and malformed file paths while allowing admin previews", async () => {
    mocks.admin = true;
    for (const range of [
      "bytes=99-",
      "bytes=8-2",
      "bytes=-0",
      "bytes=0-1,4-5",
    ]) {
      const response = await media(
        new Request(`http://localhost:3000/api/media/${path}`, {
          headers: { range },
        }),
        params,
      );
      expect(response.status).toBe(416);
      expect(response.headers.get("content-range")).toBe("bytes */10");
    }
    expect(
      (
        await media(new Request("http://localhost:3000"), {
          params: Promise.resolve({ path: "../private.mp4" }),
        })
      ).status,
    ).toBe(404);
    const preview = await media(
      new Request(`http://localhost:3000/api/media/${path}`),
      params,
    );
    expect(preview.status).toBe(200);
    expect(await preview.text()).toBe("0123456789");
  });
});

describe("authenticated upload limits", () => {
  it("requires admin access and rejects spoofed MIME plus oversized requests before uploading", async () => {
    const fake = new File(["<script>alert(1)</script>"], "fake.mp4", {
      type: "video/mp4",
    });
    expect((await upload(uploadRequest(fake))).status).toBe(403);
    mocks.admin = true;
    expect((await upload(uploadRequest(fake))).status).toBe(400);
    expect((await upload(uploadRequest(fake, "21000000"))).status).toBe(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("stores a valid MP4 as private media using a random path", async () => {
    mocks.admin = true;
    const bytes = new Uint8Array([
      0,
      0,
      0,
      24,
      ...new TextEncoder().encode("ftypisom"),
    ]);
    const response = await upload(
      uploadRequest(new File([bytes], "video.mp4", { type: "video/mp4" })),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      url: expect.stringMatching(/^\/api\/media\/[a-f0-9-]{36}\.mp4$/),
    });
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/\.mp4$/),
      bytes,
      { contentType: "video/mp4", upsert: false },
    );
  });
});
