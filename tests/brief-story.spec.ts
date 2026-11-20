import { test, expect } from "@playwright/test";

// Owner brief 19/11: the site tells the "hạt đậu bình an" story.
test("home leads with the story, then categories, values and gift wording", async ({
  page,
}) => {
  await page.goto("/");
  const header = page.locator("header");
  await expect(header.getByText("Nét mộc - Tâm an")).toBeVisible();
  await expect(page.getByText("Gom nét mộc, tạo góc xinh")).toHaveCount(0);

  const top = async (selector: string) =>
    (await page.locator(selector).boundingBox())!.y;
  const order = [
    ".store-home-campaign",
    ".store-home-story",
    ".store-home-categories",
    ".store-benefits",
    ".store-home-gifts",
    ".store-home-products",
  ];
  const tops = await Promise.all(order.map(top));
  expect([...tops].sort((a, b) => a - b)).toEqual(tops);

  const story = page.locator("#home-story-title");
  await expect(story).toHaveText(
    "Một tiếng động nhỏ,\nkhởi đầu cho một ý\u00a0nghĩa lớn",
  );
  await expect(story).toHaveCSS("text-align", "center");

  await expect(
    page.getByRole("heading", { name: "Một hạt đậu, hai cách bình an" }),
  ).toBeVisible();
  await expect(page.getByText("Bình an luôn đồng hành")).toBeVisible();
  await expect(page.getByText("Bình an trong từng góc nhỏ")).toBeVisible();
  for (const value of [
    "Gửi gắm sự bình yên",
    "Vẻ đẹp của an nhiên",
    "Đồng hành cùng bạn",
  ])
    await expect(page.getByRole("heading", { name: value })).toBeVisible();

  const gifts = page.locator(".store-home-gifts");
  await expect(
    gifts.getByRole("heading", { name: "Gửi quà, gửi cả lời chúc" }),
  ).toBeVisible();
  // Option B, card deck: one message on top, "Lá tiếp theo" brings the next.
  const front = gifts.locator('.store-gift-note[data-depth="0"]');
  await expect(front).toHaveCount(1);
  await expect(front).toContainText("Khi muốn chúc điều tốt lành");
  await expect(front).toContainText("Mình gửi bạn một chút bình an.");
  const nextCard = gifts.getByRole("button", { name: "Lá tiếp theo" });
  for (const occasion of [
    "Khi người ấy đang bận rộn",
    "Khi người ấy bắt đầu điều mới",
    "Khi muốn nói lời cảm ơn",
  ]) {
    await nextCard.click();
    await expect(front).toContainText(occasion);
  }
  await expect(front).toContainText(
    "Cảm ơn bạn vì đã luôn ở đó. Chúc bạn luôn bình an.",
  );
  await expect(gifts.locator("[aria-live=polite]")).toContainText(
    "Cảm ơn bạn vì đã luôn ở đó.",
  );
  // The heading stays left-aligned with the rest of the page.
  await expect(
    gifts.getByRole("heading", { name: "Gửi quà, gửi cả lời chúc" }),
  ).toHaveCSS("text-align", "start");
  await expect(
    gifts.getByRole("link", { name: "Chọn một món quà" }),
  ).toHaveAttribute("href", "/san-pham");
});

test("footer shows the new logo and slogan", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByText("Nét mộc - Tâm an")).toBeVisible();
  const logo = footer.getByRole("img", { name: "Logo Mộc Bàm" });
  await logo.scrollIntoViewIfNeeded();
  await expect(logo).toBeVisible();
  await expect
    .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
});

test("Chúng tôi opens with a wide photo and centred story", async ({
  page,
}) => {
  await page.goto("/chung-toi");
  const banner = page.locator(".store-about-banner");
  const title = page.getByRole("heading", { level: 1 });
  const [bannerBox, titleBox] = await Promise.all([
    banner.boundingBox(),
    title.boundingBox(),
  ]);
  expect(bannerBox!.y + bannerBox!.height).toBeLessThanOrEqual(titleBox!.y);
  expect(bannerBox!.width / bannerBox!.height).toBeCloseTo(16 / 7, 1);
  await expect(title).toHaveCSS("text-align", "center");
  for (const value of ["Mộc mạc", "Tỉ mỉ", "Bình an"])
    await expect(
      page.getByRole("heading", { name: value, exact: true }),
    ).toBeVisible();
});

test("contact page drops phone and hours and links Threads", async ({
  page,
}) => {
  await page.goto("/lien-he");
  const details = page.locator(".store-contact-details");
  await expect(details.getByText("Thời gian đồng hành")).toHaveCount(0);
  await expect(details.getByText("090 000 0000")).toHaveCount(0);
  await expect(details.getByText("Zalo")).toHaveCount(0);
  // Threads joins Facebook, Instagram and TikTok rather than replacing them.
  await expect(details.locator("a[target=_blank]")).toHaveText([
    "Facebook",
    "Instagram",
    "TikTok",
    "Threads",
  ]);
  await expect(
    details.getByRole("link", { name: "Threads", exact: true }),
  ).toHaveAttribute("href", /threads\.com/);
});

test("post title and text spread to the cover width", async ({ page }) => {
  await page.goto("/blog");
  await page.locator('a[href^="/blog/"]').first().click();
  await expect(page).toHaveURL(/\/blog\/.+/);
  const widths = await Promise.all(
    [".store-article-heading", ".store-article-body"].map(
      async (selector) => (await page.locator(selector).boundingBox())!.width,
    ),
  );
  const cover = page.locator(".store-article-cover");
  if (await cover.count()) widths.push((await cover.boundingBox())!.width);
  for (const width of widths)
    expect(Math.abs(width - widths[0])).toBeLessThan(2);
});
