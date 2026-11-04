import { expect, test } from "@playwright/test";
import { guardAgainstRealSends, LOCALES, loginToPanel, prefix, TINY_PNG } from "./helpers";

for (const locale of LOCALES) {
  test(`full order in ${locale}: builder, status page, panel, status change`, async ({ page, context, request }) => {
    await guardAgainstRealSends(page);
    await page.goto(`${prefix(locale)}/order`);
    await page.evaluate(() => localStorage.removeItem("tc-order-draft"));
    await page.reload();

    // Step 1: cannot continue without a choice.
    await page.getByTestId("next").click();
    await expect(page.getByTestId("step-error")).toBeVisible();
    await page.locator('[data-value="birthday"]').click();
    await page.getByTestId("next").click();

    // Step 2: the drawing answers the guest count.
    await page.locator('[data-value="tiered"]').click();
    await page.fill("#guests", "24");
    await expect(page.getByTestId("size-summary")).toContainText("24");
    await page.getByTestId("next").click();

    // Step 3: no price appears while prices are unconfirmed.
    await page.locator('[data-value="chocolate"]').click();
    await expect(page.getByTestId("price-line")).not.toContainText(/\d/);
    await page.getByTestId("next").click();

    // Step 4: a file that is not an image is refused, a real one is accepted.
    await page.getByTestId("upload-input").setInputFiles({ name: "cake.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<html>not a photo</html>") });
    await expect(page.getByTestId("upload-error")).toBeVisible();
    await page.getByTestId("upload-input").setInputFiles({ name: "cake.png", mimeType: "image/png", buffer: TINY_PNG });
    await expect(page.getByTestId("upload-done")).toBeVisible();
    await page.locator('[data-value="piggy"]').click();
    await page.fill("#inscription", "E2E");
    await page.getByTestId("next").click();

    // Step 5: today cannot be chosen, and leaving without a date is refused.
    await page.getByTestId("next").click();
    await expect(page.getByTestId("error-date")).toBeVisible();
    const today = await page.evaluate(() => fetch("/api/availability").then((r) => r.json()).then((d) => d.today as string));
    await expect(page.locator(`[data-day="${today}"]`)).toBeDisabled();
    await page.getByTestId("calendar-next").click();
    await page.locator("[data-day]:not([disabled])").first().click();
    await expect(page.getByTestId("date-chosen")).toBeVisible();
    await page.getByTestId("next").click();

    // Step 6: details, consent, and the plain statement that this is a demo.
    await page.fill("#customerName", "Nino Lastnamecheck");
    await page.fill("#customerPhone", "abc");
    await page.getByTestId("privacy").check();
    await page.getByTestId("submit").click();
    await expect(page.getByTestId("error-customerPhone")).toBeVisible();
    await page.fill("#customerPhone", "+995 000 00 00 00");
    await expect(page.getByTestId("demo-note")).toBeVisible();
    await page.getByTestId("submit").click();

    const title = page.getByTestId("result-title");
    await expect(title).toBeVisible();
    const reference = (await title.getAttribute("data-reference"))!;
    expect(reference).toMatch(/^TC-\d{4}-\d{4}$/);
    await expect(page.getByTestId("result-demo")).toBeVisible();
    await expect(page.getByTestId("result-message")).toHaveValue(new RegExp(reference));
    await expect(page.getByTestId("open-instagram")).toHaveAttribute("href", "https://ig.me/m/tbilisi_cake");

    // Status page: first name only.
    await page.getByTestId("status-link").click();
    await expect(page.getByTestId("status-value")).toHaveAttribute("data-status", "new");
    await expect(page.getByTestId("status-demo")).toBeVisible();
    await expect(page.locator("main")).toContainText("Nino");
    expect(await page.content()).not.toContain("Lastnamecheck");
    const statusUrl = page.url();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    // Panel: the order is there, with the customer's photo, and can change status.
    const panel = await context.newPage();
    await loginToPanel(panel);
    const row = panel.locator(`tr[data-reference="${reference}"]`);
    await expect(row).toBeVisible();
    await row.getByRole("link", { name: reference }).click();
    await expect(panel.getByTestId("admin-order-title")).toHaveText(reference);
    await expect(panel.getByTestId("admin-upload")).toBeVisible();
    const naturalWidth = await panel.getByTestId("admin-upload").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
    await panel.getByTestId("status-select").selectOption("confirmed");
    await panel.getByTestId("status-save").click();
    await expect(panel.getByTestId("status-select")).toHaveValue("confirmed");
    await panel.close();

    await page.goto(statusUrl);
    await expect(page.getByTestId("status-value")).toHaveAttribute("data-status", "confirmed");

    // Nothing tried to open a real conversation by itself.
    expect(await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened.length)).toBe(0);
    expect((await request.get("/api/availability")).ok()).toBe(true);
  });
}

test("the draft survives a reload and can be cleared", async ({ page }) => {
  await guardAgainstRealSends(page);
  await page.goto("/en/order");
  await page.evaluate(() => localStorage.removeItem("tc-order-draft"));
  await page.reload();
  await page.locator('[data-value="wedding"]').click();
  await page.getByTestId("next").click();
  await page.reload();
  await expect(page.getByTestId("progress")).toContainText("2");
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByTestId("progress")).toContainText("1");
});

test("'I want one like this' opens the builder with that cake as the reference", async ({ page }) => {
  await guardAgainstRealSends(page);
  await page.goto("/en/order");
  await page.evaluate(() => localStorage.removeItem("tc-order-draft"));
  await page.goto("/en/cakes/gothic-sword");
  await page.getByRole("link", { name: "I want one like this" }).click();
  await page.waitForURL(/like=gothic-sword/);
  await expect(page.locator(".builder-summary")).toContainText("The sword");
});
