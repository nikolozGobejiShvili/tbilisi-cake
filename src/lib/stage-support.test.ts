import assert from "node:assert/strict";
import { test } from "node:test";
import { isSoftwareRenderer, STAGE_SCRIPT } from "./stage-support.ts";

test("software renderers get the still image", () => {
  for (const name of [
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Software Rasterizer",
  ]) {
    assert.equal(isSoftwareRenderer(name), true, name);
  }
});

test("real graphics chips get the 3D cake", () => {
  for (const name of [
    "ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164C) Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "Apple GPU",
    "Adreno (TM) 740",
    "Mali-G78",
    "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
  ]) {
    assert.equal(isSoftwareRenderer(name), false, name);
  }
});

test("the inline script tests only the home page in each language", () => {
  const pattern = new RegExp(STAGE_SCRIPT.match(/\/\^(.*?)\$\//)![0].slice(1, -1));
  for (const path of ["/", "/ru", "/ru/", "/en", "/en/"]) assert.equal(pattern.test(path), true, path);
  for (const path of ["/cakes", "/ru/cakes", "/en/order", "/rus", "/admin"]) assert.equal(pattern.test(path), false, path);
});
