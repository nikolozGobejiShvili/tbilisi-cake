// Renders the still image used without WebGL or with reduced motion, from the real 3D cake.
// Needs the site running. Usage: node scripts/make-poster.mjs
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.goto(`${BASE}/en`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".stage-canvas.is-ready", { timeout: 60000 });
await page.addStyleTag({ content: "header, .chapter, .stage-cue, .stage-track, [data-testid='concept-banner'], nextjs-portal { visibility: hidden !important; }" });
await page.waitForTimeout(6000);
const box = await page.locator(".stage-canvas").boundingBox();
const png = await page.screenshot({ clip: { x: box.x + box.width * 0.44, y: box.y + 40, width: 780, height: 780 } });
const webp = await sharp(png).resize(1200, 1200).webp({ quality: 84 }).toBuffer();
writeFileSync("public/brand/cake-poster.webp", webp);
console.log("poster", webp.length, "bytes");
await browser.close();
