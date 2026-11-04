import { expect, test } from "@playwright/test";
import { expectNoOverflow, guardAgainstRealSends, LOCALES, prefix } from "./helpers";

const PAGES = ["", "/cakes", "/order", "/fillings", "/prices", "/delivery", "/reviews", "/faq", "/about", "/privacy"];
const CATEGORY_SLUGS = ["signature", "bento", "kids", "wedding", "desserts"];
const WORK_SLUGS = ["air-cloud", "frog-wedding", "raspberries", "sunflower", "ribbons", "piggy", "rose", "gothic-sword", "white-flowers", "first-birthday", "birthday-pink"];
const ALL = [...PAGES, ...[...CATEGORY_SLUGS, ...WORK_SLUGS].map((slug) => `/cakes/${slug}`)];
const WIDTHS = [320, 390, 768, 1440];

test("every public page: no overflow, no console errors, concept label and noindex, no invented price", async ({ page }) => {
  test.setTimeout(900_000);
  await guardAgainstRealSends(page);
  const problems: string[] = [];
  let current = "";
  page.on("pageerror", (error) => problems.push(`${current}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/instagram|ig\.me/.test(message.text())) problems.push(`${current}: ${message.text()}`);
  });

  for (const locale of LOCALES) {
    for (const path of ALL) {
      const url = `${prefix(locale)}${path}` || "/";
      current = url;
      const response = await page.goto(url, { waitUntil: "load" });
      expect(response?.status(), url).toBe(200);
      await expect(page.locator("html"), url).toHaveAttribute("lang", locale);
      await expect(page.getByTestId("concept-banner"), url).toBeVisible();
      await expect(page.locator('meta[name="robots"]'), url).toHaveAttribute("content", /noindex/);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await expectNoOverflow(page, `${url} at ${width}px`);
      }
      // A price is a fact the owner has not confirmed, so no amount may be on any page.
      const text = await page.locator("body").innerText();
      expect(/\d+\s*(GEL|₾|ლარი|лари)/i.test(text), `amount shown on ${url}`).toBe(false);
    }
  }
  expect(problems).toEqual([]);
});

test("favourites and the lightbox work", async ({ page }) => {
  await guardAgainstRealSends(page);
  await page.goto("/en/cakes");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator(".look").first().getByRole("button", { name: "Save to favourites" }).click();
  await page.getByRole("button", { name: "Favourites", exact: true }).click();
  await expect(page.locator(".look")).toHaveCount(1);
  await page.getByRole("button", { name: "Favourites", exact: true }).click();

  await page.locator(".look").first().locator("a").first().click();
  const dialog = page.locator("dialog.lightbox");
  await expect(dialog).toBeVisible();
  const title = await dialog.locator("h2").innerText();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator("h2")).not.toHaveText(title);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("on a phone the menu opens, navigates and closes", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL: "http://localhost:3100" });
  const page = await context.newPage();
  await guardAgainstRealSends(page);
  await page.goto("/en");
  await expect(page.locator("#site-menu")).toHaveCount(0);
  await page.getByRole("button", { name: "Menu" }).click();
  await page.locator("#site-menu").getByRole("link", { name: "Fillings" }).click();
  await page.waitForURL(/\/en\/fillings$/);
  await expect(page.locator("#site-menu")).toHaveCount(0);
  await page.getByRole("button", { name: "Menu" }).click();
  await page.locator("#site-menu").getByRole("link", { name: "Русский" }).click();
  await page.waitForURL(/\/ru\/fillings$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await context.close();
});

for (const width of [1440, 768, 390, 320]) {
  test(`the photos form an orderly grid at ${width} px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, baseURL: "http://localhost:3100" });
    const page = await context.newPage();
    await guardAgainstRealSends(page);
    await page.goto("/en/cakes", { waitUntil: "networkidle" });
    const tiles = await page.locator(".look-frame").evaluateAll((items) =>
      items.map((item) => {
        const box = item.getBoundingClientRect();
        return { x: Math.round(box.x), y: Math.round(box.y + window.scrollY), w: Math.round(box.width), h: Math.round(box.height) };
      }),
    );
    expect(tiles.length).toBe(12);
    // Every tile is the same size, and square.
    expect(new Set(tiles.map((t) => t.w)).size).toBe(1);
    expect(new Set(tiles.map((t) => t.h)).size).toBe(1);
    expect(Math.abs(tiles[0].w - tiles[0].h)).toBeLessThanOrEqual(1);
    // Tiles line up in columns, and each row starts level.
    const columns = new Set(tiles.map((t) => t.x));
    expect(columns.size).toBeLessThanOrEqual(4);
    const perRow = columns.size;
    for (let i = 0; i < tiles.length; i += perRow) {
      expect(new Set(tiles.slice(i, i + perRow).map((t) => t.y)).size).toBe(1);
    }
    await expect(page.getByTestId("lookbook-invite")).toHaveAttribute("href", "/en/order");
    await context.close();
  });
}

test("an empty category points to Instagram instead of showing nothing", async ({ page }) => {
  await guardAgainstRealSends(page);
  await page.goto("/en/cakes/bento");
  await expect(page.getByRole("link", { name: "Open Instagram" })).toBeVisible();
});

test("search engines are kept out while this is a concept", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toMatch(/Disallow: \//);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("<loc>");
});
