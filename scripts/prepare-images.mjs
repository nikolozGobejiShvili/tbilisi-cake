// Cuts the works out of the operator's two Instagram screenshots.
// Crops avoid the interface that covers parts of the photos: pin and carousel icons,
// the Messages bubble and the URL tooltip. The frog-shaped cake is left out because a
// hover overlay darkens it. When the owner sends originals, replace these files and
// the sizes in src/config/works.ts; nothing else needs to change.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const A = "C:/Users/Greench Pc/Desktop/ნამცხვრები.jpg";
const B = "C:/Users/Greench Pc/Desktop/ნამხვცრები 2.jpg";
const OUT = "public/works";

/** [name, source, left, top, right, bottom], edges inclusive of left/top. */
const CROPS = [
  ["birthday-pink", A, 247, 655, 548, 928],
  ["white-flowers", A, 599, 655, 900, 928],
  ["air-cloud", A, 950, 655, 1252, 928],
  ["raspberries", A, 1302, 655, 1542, 928],
  ["frog-wedding", B, 247, 12, 598, 479],
  ["sunflower", B, 950, 12, 1301, 479],
  ["gothic-sword", B, 1302, 58, 1653, 479],
  ["ribbons", B, 247, 481, 598, 908],
  ["first-birthday", B, 599, 481, 949, 937],
  ["piggy", B, 950, 481, 1301, 937],
  ["rose", B, 1302, 524, 1545, 826],
];

mkdirSync(OUT, { recursive: true });
mkdirSync("public/brand", { recursive: true });

// sharp keeps files opened by path locked on Windows, so read to a buffer first.
const sources = new Map([[A, readFileSync(A)], [B, readFileSync(B)]]);

for (const [name, src, left, top, right, bottom] of CROPS) {
  const width = right - left;
  const height = bottom - top;
  const buffer = await sharp(sources.get(src))
    .extract({ left, top, width, height })
    .webp({ quality: 92 })
    .toBuffer();
  writeFileSync(join(OUT, `${name}.webp`), buffer);
  console.log(name, width, height, buffer.length);
}

// The logo circle as it appears on the profile, for reference while redrawing it.
const logo = await sharp(sources.get(A)).extract({ left: 525, top: 44, width: 188, height: 188 }).png().toBuffer();
writeFileSync("research/logo-from-screenshot.png", logo);

// The link preview: blush ground, the monogram and the site's two moods side by side.
const monogram = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="400" viewBox="0 0 200 160" fill="none" stroke="#6C3024"><path d="M8 14H112" stroke-width="3"/><path d="M8 14V26M112 14V26" stroke-width="1.5"/><path d="M60 14V146" stroke-width="7"/><path d="M46 148H74" stroke-width="2"/><path d="M188 40A62 62 0 1 0 188 122" stroke-width="3"/></svg>`,
);
const moodPhoto = (name) => sharp(readFileSync(join(OUT, `${name}.webp`))).resize({ height: 470 }).png().toBuffer();
const og = await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#EAC0BA" } })
  .composite([
    { input: monogram, left: 40, top: 115 },
    { input: await moodPhoto("frog-wedding"), left: 840, top: 80 },
    { input: await moodPhoto("air-cloud"), left: 480, top: 80 },
  ])
  .jpeg({ quality: 88 })
  .toBuffer();
writeFileSync("public/brand/og.jpg", og);

// Contact sheet for looking at all crops at once.
const cell = 260;
const composites = [];
let index = 0;
for (const [name] of CROPS) {
  const tile = await sharp(readFileSync(join(OUT, `${name}.webp`))).resize(cell, cell, { fit: "contain", background: "#ffffff" }).png().toBuffer();
  composites.push({ input: tile, left: (index % 4) * (cell + 8), top: Math.floor(index / 4) * (cell + 8) });
  index += 1;
}
const sheet = await sharp({ create: { width: 4 * (cell + 8), height: 3 * (cell + 8), channels: 3, background: "#888888" } })
  .composite(composites).jpeg({ quality: 85 }).toBuffer();
writeFileSync("research/contact-sheet.jpg", sheet);

// Colours for the design tokens: frog green and the white of the cake boards.
const sample = async (name, box) => {
  const { data, info } = await sharp(sources.get(name)).extract(box).raw().toBuffer({ resolveWithObject: true });
  const counts = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const key = [data[i], data[i + 1], data[i + 2]].map((v) => Math.floor(v / 8) * 8).map((v) => v.toString(16).padStart(2, "0")).join("");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, v]) => `#${k.toUpperCase()}:${v}`).join(" ");
};
console.log("frog topper green", await sample(B, { left: 350, top: 125, width: 30, height: 25 }));
console.log("second frog green", await sample(B, { left: 425, top: 145, width: 40, height: 22 }));
console.log("backdrop leaves  ", await sample(B, { left: 260, top: 40, width: 70, height: 70 }));
console.log("cake board white ", await sample(B, { left: 620, top: 830, width: 40, height: 30 }));
console.log("white cake body  ", await sample(B, { left: 330, top: 300, width: 100, height: 40 }));
console.log("butter wrap      ", await sample(B, { left: 1040, top: 300, width: 40, height: 60 }));
