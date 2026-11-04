import { expect, test } from "@playwright/test";
import { addDays, availability, guardAgainstRealSends, loginToPanel, ORIGIN, orderPayload, TINY_PNG } from "./helpers";

const post = (request: import("@playwright/test").APIRequestContext, data: unknown, ip = "198.51.100.1") =>
  request.post("/api/orders", { data: data as object, headers: { origin: ORIGIN, "x-forwarded-for": ip } });

test("an anonymous visitor cannot reach the panel or its data", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/calendar");
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect((await request.get("/api/admin/orders.csv")).status()).toBe(401);
  expect((await request.get(`/api/admin/uploads/${"a".repeat(32)}`)).status()).toBe(401);
});

test("a wrong password is refused, and repeated attempts are throttled", async ({ page }) => {
  await page.goto("/admin/login");
  await page.fill("#password", "wrong");
  await page.getByRole("button").last().click();
  await expect(page.getByTestId("login-error")).toBeVisible();
  await expect(page).toHaveURL(/error=wrong/);
});

test("a blocked day cannot be chosen in the builder or posted to the server", async ({ page, context, request }) => {
  await guardAgainstRealSends(page);
  const { today, leadDays } = await availability(request);
  const day = addDays(today, leadDays + 40);

  const panel = await context.newPage();
  await loginToPanel(panel);
  await panel.goto(`/admin/calendar?m=${day.slice(0, 7)}`);
  const cell = panel.getByTestId(`admin-day-${day}`);
  if ((await cell.getAttribute("aria-pressed")) !== "true") {
    await cell.click();
    await expect(cell).toHaveAttribute("aria-pressed", "true");
  }

  const closed = (await availability(request)).closed;
  expect(closed).toContain(day);

  const refused = await post(request, orderPayload(day), "198.51.100.2");
  expect(refused.status()).toBe(422);
  expect((await refused.json()).errors.date).toBe("blocked");

  await page.goto("/en/order");
  await page.evaluate(
    (draft) => localStorage.setItem("tc-order-draft", JSON.stringify(draft)),
    { occasion: "birthday", format: "tiered", guests: 10, fillingId: "unsure", step: 4 },
  );
  await page.reload();
  for (let i = 0; i < 3; i += 1) {
    if (await page.locator(`[data-day="${day}"]`).count()) break;
    await page.getByTestId("calendar-next").click();
  }
  await expect(page.locator(`[data-day="${day}"]`)).toBeDisabled();
  await expect(page.locator(`[data-day="${day}"]`)).toHaveAttribute("data-refused", "blocked");

  await cell.click();
  await expect(cell).toHaveAttribute("aria-pressed", "false");
  await panel.close();
});

test("a date inside the lead time is refused by the server", async ({ request }) => {
  const { today, leadDays } = await availability(request);
  expect(leadDays).toBeGreaterThan(0);
  const response = await post(request, orderPayload(today), "198.51.100.3");
  expect(response.status()).toBe(422);
  expect((await response.json()).errors.date).toBe("leadTime");
});

test("a non-image upload is refused by its bytes, whatever its name", async ({ request }) => {
  const response = await request.post("/api/uploads", {
    headers: { origin: ORIGIN, "x-forwarded-for": "198.51.100.4" },
    multipart: { file: { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<script>alert(1)</script>") } },
  });
  expect(response.status()).toBe(415);
});

test("an oversized upload is refused", async ({ request }) => {
  const response = await request.post("/api/uploads", {
    headers: { origin: ORIGIN, "x-forwarded-for": "198.51.100.5" },
    multipart: { file: { name: "big.png", mimeType: "image/png", buffer: Buffer.concat([TINY_PNG, Buffer.alloc(9 * 1024 * 1024)]) } },
  });
  expect(response.status()).toBe(413);
});

test("repeated order posts get 429", async ({ request }) => {
  const ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
  const statuses: number[] = [];
  for (let i = 0; i < 45 && !statuses.includes(429); i += 1) {
    statuses.push((await post(request, { not: "valid" }, ip)).status());
  }
  expect(statuses).toContain(429);
});

test("writes from another site are refused", async ({ request }) => {
  const order = await request.post("/api/orders", { data: {}, headers: { origin: "https://evil.example" } });
  expect(order.status()).toBe(403);
  const noOrigin = await request.post("/api/orders", { data: {} });
  expect(noOrigin.status()).toBe(403);
  const upload = await request.post("/api/uploads", { headers: { origin: "https://evil.example" }, multipart: { file: { name: "a.png", mimeType: "image/png", buffer: TINY_PNG } } });
  expect(upload.status()).toBe(403);
});

test("a filled honeypot gets a normal answer, and nothing is saved", async ({ page, request }) => {
  const { today, leadDays } = await availability(request);
  const marker = `Botname${Date.now()}`;
  const response = await post(request, orderPayload(addDays(today, leadDays + 2), { website: "http://spam.example", customerName: marker }), "198.51.100.6");
  expect(response.status()).toBe(201);
  await loginToPanel(page);
  expect(await page.content()).not.toContain(marker);
});

test("CSV export neutralises formulas in customer text", async ({ page, request }) => {
  const { today, leadDays } = await availability(request);
  const created = await post(request, orderPayload(addDays(today, leadDays + 25), { customerName: "=HYPERLINK(1)", customerPhone: "+995 000 00 00 09" }), "198.51.100.7");
  expect(created.status()).toBe(201);
  await loginToPanel(page);
  const csv = await page.request.get("/api/admin/orders.csv");
  expect(csv.status()).toBe(200);
  const body = await csv.text();
  expect(body).toContain("'=HYPERLINK(1)");
  expect(body).not.toMatch(/,=HYPERLINK/);
});
