import { expect, test } from "@playwright/test";
import { guardAgainstRealSends, tabTo } from "./helpers";

test("the whole order flow works with the keyboard alone", async ({ page }) => {
  await guardAgainstRealSends(page);
  await page.goto("/en/order");
  await page.evaluate(() => localStorage.removeItem("tc-order-draft"));
  await page.reload();

  const next = async () => {
    await tabTo(page, '[data-testid="next"]');
    await page.keyboard.press("Enter");
  };

  await tabTo(page, '[data-value="kids"]');
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-value="kids"]')).toHaveAttribute("aria-pressed", "true");
  await next();
  await expect(page.getByTestId("progress")).toContainText("2");
  // Focus moves to the new step's heading, so the keyboard user lands in the right place.
  await expect(page.getByTestId("step-title")).toBeFocused();

  await tabTo(page, '[data-value="bento"]');
  await page.keyboard.press("Space");
  await next();

  await tabTo(page, '[data-value="unsure"]');
  await page.keyboard.press("Enter");
  await next();

  await tabTo(page, "#inscription");
  await page.keyboard.type("Keyboard");
  // Typing must keep focus in the field, one letter at a time.
  await expect(page.locator("#inscription")).toBeFocused();
  await expect(page.locator("#inscription")).toHaveValue("Keyboard");
  await next();

  await tabTo(page, '[data-testid="calendar-next"]');
  await page.keyboard.press("Enter");
  await tabTo(page, "[data-day]:not([disabled])");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("date-chosen")).toBeVisible();
  await next();

  await tabTo(page, "#customerName");
  await page.keyboard.type("Keyboard User");
  await tabTo(page, "#customerPhone");
  await page.keyboard.type("+995 000 00 00 00");
  await tabTo(page, '[data-testid="privacy"]');
  await page.keyboard.press("Space");
  await expect(page.getByTestId("privacy")).toBeChecked();
  await tabTo(page, '[data-testid="submit"]');
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("result-title")).toBeVisible();
});

test("the skip link appears on the first Tab", async ({ page }) => {
  await guardAgainstRealSends(page);
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByTestId("skip-link");
  await expect(skip).toBeFocused();
  const box = await skip.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(20);
});

test("the focus ring stands out from what surrounds it, on the page and on sheets", async ({ page }) => {
  await guardAgainstRealSends(page);
  const luminance = (rgb: string) => {
    const [r, g, b] = (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  await page.goto("/en");
  const onGround = await page.locator("header a.btn-primary").evaluate((el) => {
    (el as HTMLElement).focus();
    return { ring: getComputedStyle(el).outlineColor, around: getComputedStyle(document.body).backgroundColor };
  });
  expect(contrast(onGround.ring, onGround.around), "ground").toBeGreaterThanOrEqual(3);

  await page.goto("/en/order");
  const onSheet = await page.getByTestId("next").evaluate((el) => {
    (el as HTMLElement).focus();
    return { ring: getComputedStyle(el).outlineColor, around: getComputedStyle(el.closest(".on-sheet")!).backgroundColor };
  });
  expect(contrast(onSheet.ring, onSheet.around), "sheet").toBeGreaterThanOrEqual(3);
});

test("a field with an error says so to assistive technology", async ({ page }) => {
  await guardAgainstRealSends(page);
  await page.goto("/en/order");
  await page.evaluate(
    (draft) => localStorage.setItem("tc-order-draft", JSON.stringify(draft)),
    { occasion: "birthday", format: "tiered", guests: 10, fillingId: "unsure", step: 5, date: "" },
  );
  await page.reload();
  await page.getByTestId("submit").click();
  // Validation returns the customer to the first step with a problem, which here is the date.
  await expect(page.getByTestId("step-error")).toBeVisible();
  await expect(page.getByTestId("step-error")).toHaveAttribute("role", "alert");
  await expect(page.getByTestId("error-date")).toBeVisible();
  await page.getByTestId("calendar-next").click();
  await page.locator("[data-day]:not([disabled])").first().click();
  await page.getByTestId("next").click();
  await page.getByTestId("submit").click();
  const name = page.locator("#customerName");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAttribute("aria-describedby", "customerName-error");
});

test("with reduced motion, the builder drawing does not animate", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce", baseURL: "http://localhost:3100" });
  const page = await context.newPage();
  await guardAgainstRealSends(page);
  await page.goto("/en/order");
  await page.evaluate(() => localStorage.removeItem("tc-order-draft"));
  await page.reload();
  // The first choice is what turns the drawing's motion on, so check it after one.
  await page.locator('[data-value="birthday"]').click();
  await expect(page.locator(".cake-drawing.is-animated")).toBeVisible();
  const value = await page.locator(".slice-layer").first().evaluate((el) => getComputedStyle(el).animationDuration);
  const seconds = value.endsWith("ms") ? parseFloat(value) / 1000 : parseFloat(value);
  expect(seconds).toBeLessThan(0.01);
  await context.close();
});
