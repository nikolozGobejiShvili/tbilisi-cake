// Photographs the home page cake through its arrival and at points along the scroll, into one sheet.
// Usage: node scripts/stage-shots.mjs <outDir> <path> <width> <height> [name]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const [outDir, path = "/en", widthArg = "1440", heightArg = "900", name = "stage"] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);
const BASE = process.env.BASE_URL || "http://localhost:3100";
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"] });
const context = await browser.newContext({ viewport: { width, height } });
const page = await context.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});

await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".stage-canvas.is-ready", { timeout: 60000 }).catch((error) => {
  console.log("cake did not start:", error.message.split("\n")[0], problems);
  process.exit(1);
});
const renderer = await page.evaluate(() => {
  const gl = document.createElement("canvas").getContext("webgl2");
  const info = gl?.getExtension("WEBGL_debug_renderer_info");
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
});
console.log("renderer:", renderer);

const shots = [];
const take = async (label) => {
  const file = join(outDir, `${name}-${label}.png`);
  await page.screenshot({ path: file });
  shots.push(file);
};

await page.waitForTimeout(500);
await take("a1");
await page.waitForTimeout(1200);
await take("a2");
await page.waitForTimeout(3600);
await take("a3");

// Frames per second during the settled hero.
const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      const step = () => {
        frames += 1;
        if (performance.now() - start > 2000) resolve(Math.round((frames * 1000) / (performance.now() - start)));
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }),
);
console.log("fps while settled:", fps);

const scrollable = await page.evaluate(() => {
  const stage = document.querySelector(".stage");
  return { top: stage.offsetTop, range: stage.offsetHeight - window.innerHeight };
});
for (const fraction of (process.env.POINTS || "0.2,0.3,0.48,0.6,0.84,0.97").split(",").map(Number)) {
  await page.evaluate(({ y }) => window.scrollTo(0, y), { y: scrollable.top + scrollable.range * fraction });
  await page.waitForTimeout(2600);
  await take(`s${Math.round(fraction * 100)}`);
}

const cellW = 640;
const cellH = Math.round((cellW * height) / width);
const columns = 3;
const rows = Math.ceil(shots.length / columns);
const tiles = await Promise.all(
  shots.map(async (file, i) => ({
    input: await sharp(file).resize(cellW, cellH).png().toBuffer(),
    left: (i % columns) * (cellW + 6),
    top: Math.floor(i / columns) * (cellH + 6),
  })),
);
const sheet = await sharp({ create: { width: columns * (cellW + 6), height: rows * (cellH + 6), channels: 3, background: "#444" } }).composite(tiles).jpeg({ quality: 82 }).toBuffer();
writeFileSync(join(outDir, `${name}-sheet.jpg`), sheet);
console.log("problems:", problems.length ? problems : "none");
await browser.close();
