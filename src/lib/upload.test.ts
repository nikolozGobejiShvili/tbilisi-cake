import assert from "node:assert/strict";
import { test } from "node:test";
import { sniffImage } from "./upload.ts";

test("recognises real image signatures", () => {
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "jpeg");
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  const webp = new TextEncoder().encode("RIFF0000WEBPVP8 ");
  assert.equal(sniffImage(webp), "webp");
});

test("refuses anything else, whatever it is called", () => {
  assert.equal(sniffImage(new TextEncoder().encode("<script>alert(1)</script>")), null);
  assert.equal(sniffImage(new TextEncoder().encode("GIF89a")), null);
  assert.equal(sniffImage(new Uint8Array([])), null);
  assert.equal(sniffImage(new TextEncoder().encode("RIFF0000WAVEfmt ")), null);
});
