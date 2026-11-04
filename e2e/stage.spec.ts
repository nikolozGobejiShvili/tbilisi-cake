import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { guardAgainstRealSends, LOCALES, prefix } from "./helpers";

const scrollTo = async (page: Page, fraction: number) => {
  await page.evaluate((f) => {
    const stage = document.querySelector<HTMLElement>(".stage")!;
    window.scrollTo(0, stage.offsetTop + (stage.offsetHeight - window.innerHeight) * f);
  }, fraction);
  // The scroll animation trails the scrollbar slightly, for a smoother camera.
  await page.waitForTimeout(1800);
};

/** The spread of pixel values: a blank or uniform area is close to zero. */
const pictureDetail = async (page: Page) => {
  const shot = await page.screenshot();
  const { channels } = await sharp(shot).extract({ left: 800, top: 150, width: 500, height: 600 }).stats();
  return channels[0].stdev;
};

for (const locale of LOCALES) {
  test(`the cake is drawn and follows the scroll in ${locale}`, async ({ page }) => {
    await guardAgainstRealSends(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${prefix(locale) || "/"}`);

    await expect(page.locator("html")).toHaveClass(/stage-on/);
    await page.waitForSelector(".stage-canvas.is-ready", { timeout: 60_000 });
    await expect(page.getByTestId("stage-hero")).toBeVisible();
    await page.waitForTimeout(4500);
    expect(await pictureDetail(page), "the cake is on screen").toBeGreaterThan(12);

    await scrollTo(page, 0.3);
    await expect(page.locator('[data-chapter="0"]')).toBeVisible();
    await expect(page.getByTestId("stage-hero")).toBeHidden();
    await expect.poll(() => page.locator(".stage-label").first().evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(0.5);

    await scrollTo(page, 0.6);
    await expect(page.locator('[data-chapter="1"]')).toBeVisible();
    await expect(page.locator('[data-chapter="0"]')).toBeHidden();

    await scrollTo(page, 0.86);
    const last = page.locator('[data-chapter="2"]');
    await expect(last).toBeVisible();
    await expect(last.getByRole("link")).toHaveAttribute("href", `${prefix(locale)}/order`);

    // Past the stage, the page carries on normally.
    await page.evaluate(() => document.getElementById("lookbook-title")?.scrollIntoView());
    await expect(page.getByTestId("lookbook")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("with reduced motion the opening is a still image with its text in reading order", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 }, baseURL: "http://localhost:3100" });
  const page = await context.newPage();
  await guardAgainstRealSends(page);
  await page.goto("/en");
  await expect(page.locator("html")).not.toHaveClass(/stage-on/);
  await expect(page.getByTestId("cake-canvas")).toBeHidden();
  const poster = page.locator(".stage-poster img");
  await expect(poster).toBeVisible();
  await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  for (const chapter of ["0", "1", "2"]) await expect(page.locator(`[data-chapter="${chapter}"]`)).toBeVisible();
  await expect(page.getByTestId("stage-hero")).toBeVisible();
  const stageHeight = await page.getByTestId("cake-stage").evaluate((el) => (el as HTMLElement).offsetHeight);
  expect(stageHeight).toBeLessThan(3000);
  await context.close();
});

test("without WebGL the same still image and text appear", async ({ page }) => {
  await guardAgainstRealSends(page);
  await page.addInitScript(() => {
    const real = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patched(this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
      if (kind.startsWith("webgl")) return null;
      return (real as (...args: unknown[]) => unknown).call(this, kind, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/en");
  await expect(page.locator("html")).not.toHaveClass(/stage-on/);
  await expect(page.locator(".stage-poster img")).toBeVisible();
  await expect(page.locator('[data-chapter="2"]').getByRole("link")).toBeVisible();
});

test("on a phone the labels stay on screen and the words sit above the order bar", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: "http://localhost:3100" });
  const page = await context.newPage();
  await guardAgainstRealSends(page);
  await page.goto("/ru");
  await page.waitForSelector(".stage-canvas.is-ready", { timeout: 60_000 });
  await scrollTo(page, 0.3);
  for (const label of await page.locator(".stage-label").all()) {
    const box = await label.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? 0), "label fits the screen").toBeLessThanOrEqual(390);
  }
  const words = await page.locator('[data-chapter="0"] p').last().boundingBox();
  const bar = await page.locator(".phone-bar").boundingBox();
  expect((words?.y ?? 0) + (words?.height ?? 0)).toBeLessThanOrEqual(bar?.y ?? 844);
  await context.close();
});
