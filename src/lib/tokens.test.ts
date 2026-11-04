import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const token = (name: string) => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `token --${name} not found`);
  return match[1];
};

function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const AA = 4.5;

test("text meets AA on the page and on sheets", () => {
  for (const ground of ["noir", "cocoa"]) {
    assert.ok(contrast(token("cream"), token(ground)) >= AA, `cream on ${ground}`);
    assert.ok(contrast(token("blush"), token(ground)) >= AA, `blush on ${ground}`);
    assert.ok(contrast(token("error-tone"), token(ground)) >= AA, `error on ${ground}`);
  }
});

test("the text of a filled button meets AA", () => {
  assert.ok(contrast(token("noir"), token("blush")) >= AA);
  assert.ok(contrast(token("noir"), token("cream")) >= AA);
});

test("the gold hairline is visible as a graphic element", () => {
  assert.ok(contrast(token("gold"), token("noir")) >= 3);
});
