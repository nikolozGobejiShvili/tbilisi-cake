// Takes screenshots of chosen pages, for looking at the design.
// Usage: node scripts/shots.mjs <outDir> <width> <mood> <path> [<path> ...]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [outDir, widthArg, mood, ...paths] = process.argv.slice(2);
const width = Number(widthArg);
const BASE = process.env.BASE_URL || "http://localhost:3100";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, reducedMotion: "reduce" });
await context.addInitScript((m) => {
  try {
    localStorage.setItem("tc-mood", m);
  } catch {}
}, mood);
const page = await context.newPage();
for (const path of paths) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const name = `${path.replace(/\W+/g, "_") || "home"}-${width}-${mood}.png`.replace(/^_/, "");
  await page.screenshot({ path: join(outDir, name), fullPage: process.env.FULL !== "0" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(name, "overflow", overflow, errors.length ? errors : "");
  page.removeAllListeners("pageerror");
}
await browser.close();
