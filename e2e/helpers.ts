import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const LOCALES = ["ka", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const prefix = (locale: Locale) => (locale === "ka" ? "" : `/${locale}`);

export const ADMIN_PASSWORD = "e2e-only-password";
export const ORIGIN = "http://localhost:3100";

/** A real 1x1 PNG, so the server's image re-encoding has something valid to work on. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * Nothing in the tests may reach the real business. Links to Instagram are refused
 * at the network level and window.open is replaced before any page script runs.
 */
export async function guardAgainstRealSends(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url: string) => {
      (window as unknown as { __opened: string[] }).__opened.push(String(url));
      return null;
    }) as typeof window.open;
  });
  await page.route(/(instagram\.com|ig\.me|api\.telegram\.org)/, (route) => route.abort());
}

export async function loginToPanel(page: Page) {
  await page.goto("/admin/login");
  await page.fill("#password", ADMIN_PASSWORD);
  await page.getByRole("button", { name: /.+/ }).last().click();
  await page.waitForURL(/\/admin$/);
}

/** A date inside the calendar's open range, far enough ahead to skip the lead time. */
export async function availability(request: APIRequestContext) {
  const response = await request.get("/api/availability");
  return (await response.json()) as { today: string; leadDays: number; horizonDays: number; closed: string[] };
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

export function orderPayload(date: string, patch: Record<string, unknown> = {}) {
  return {
    locale: "en",
    occasion: "birthday",
    format: "tiered",
    guests: 10,
    fillingId: "unsure",
    referenceWork: "",
    uploadId: "",
    inscription: "",
    colours: "",
    date,
    fulfilment: "pickup",
    address: "",
    isGift: false,
    recipientName: "",
    recipientPhone: "",
    cardNote: "",
    allergies: "",
    customerName: "Api Testperson",
    customerPhone: "+995 000 00 00 00",
    customerInstagram: "",
    channel: "instagram",
    reminderOptIn: false,
    privacyAccepted: true,
    website: "",
    ...patch,
  };
}

/** Presses Tab until the target has focus, proving it can be reached by keyboard alone. */
export async function tabTo(page: Page, selector: string, maxPresses = 120) {
  for (let i = 0; i < maxPresses; i += 1) {
    const focused = await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector);
    if (focused) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Could not reach ${selector} with the Tab key`);
}

export async function expectNoOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `horizontal overflow on ${label}`).toBeLessThanOrEqual(0);
}
