import { expect, test } from "@playwright/test";

const adminPaths = [
  "/admin",
  "/admin/products",
  "/admin/orders",
  "/admin/posts",
  "/admin/content",
  "/admin/inquiries",
  "/admin/settings",
  "/admin/customers",
  "/admin/discounts",
  "/admin/analytics",
];
const privateApis = [
  "products",
  "orders",
  "posts",
  "content",
  "inquiries",
  "settings",
  "discounts",
];

test("unconfigured admin shows setup instead of management controls", async ({
  page,
  request,
}) => {
  const probe = await request.get("/api/admin/products");
  test.skip(
    probe.status() !== 503,
    "This scenario requires the unconfigured local preview.",
  );
  for (const path of adminPaths) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Kết nối cửa hàng của bạn" }),
    ).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await expect(
      page.getByRole("navigation", { name: "Quản trị", exact: true }),
    ).toHaveCount(0);
  }
});

test("private reads reject anonymous requests", async ({ request }) => {
  for (const collection of privateApis) {
    const response = await request.get(`/api/admin/${collection}`);
    expect([401, 503]).toContain(response.status());
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body).not.toHaveProperty("data");
    expect(response.headers()["cache-control"]).toMatch(
      /(?:^|,)\s*no-store\s*(?:,|$)/,
    );
  }
});

test("private mutations reject anonymous requests before writing", async ({
  request,
  baseURL,
}) => {
  const origin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || baseURL || "http://127.0.0.1:3000",
  ).origin;
  const headers = { origin };
  const create = await request.post("/api/admin/products", {
    headers,
    data: {},
  });
  expect([401, 503]).toContain(create.status());
  const update = await request.patch(
    "/api/admin/orders/11111111-1111-4111-8111-111111111111",
    { headers, data: { status: "confirmed" } },
  );
  expect([401, 503]).toContain(update.status());
  const settings = await request.patch("/api/admin/settings", {
    headers,
    data: {},
  });
  expect([401, 503]).toContain(settings.status());
  const upload = await request.post("/api/admin/upload", {
    headers,
    multipart: {
      file: {
        name: "test.png",
        mimeType: "image/png",
        buffer: Buffer.from("invalid image"),
      },
    },
  });
  expect([401, 503]).toContain(upload.status());
});

test("admin rejects mutations from another origin", async ({ request }) => {
  const response = await request.post("/api/admin/posts", {
    headers: { origin: "https://untrusted.example" },
    data: {},
  });
  expect(response.status()).toBe(403);
  expect(typeof (await response.json()).error).toBe("string");
});

test("configured admin redirects anonymous visitors to sign in", async ({
  page,
  request,
}) => {
  const probe = await request.get("/api/admin/products");
  test.skip(
    probe.status() !== 401,
    "This scenario requires configured Supabase and no signed-in session.",
  );
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/tai-khoan\?next=\/admin$/);
});
