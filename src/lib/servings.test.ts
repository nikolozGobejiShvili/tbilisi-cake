import assert from "node:assert/strict";
import { test } from "node:test";
import { cakeSize, clampGuests } from "./servings.ts";

test("guest count is clamped to a whole number in range", () => {
  assert.equal(clampGuests(0), 2);
  assert.equal(clampGuests(12.4), 12);
  assert.equal(clampGuests(9999), 150);
  assert.equal(clampGuests(Number.NaN), 2);
});

test("weight rounds to the nearest half kilo and is never below half a kilo", () => {
  assert.equal(cakeSize("tiered", 2).kilograms, 0.5);
  assert.equal(cakeSize("tiered", 10).kilograms, 1.5);
  assert.equal(cakeSize("tiered", 20).kilograms, 3);
});

test("a bento is always one small cake, however many guests are typed", () => {
  const size = cakeSize("bento", 40);
  assert.deepEqual(size.tiers, [11]);
  assert.equal(size.kilograms, 0.5);
});

test("tiers grow with guests and each tier is narrower than the one below", () => {
  for (const guests of [6, 10, 20, 50, 120]) {
    const { tiers } = cakeSize("tiered", guests);
    assert.ok(tiers.length >= 1);
    tiers.slice(1).forEach((diameter, i) => assert.ok(diameter < tiers[i]));
  }
  assert.ok(cakeSize("tiered", 120).tiers.length > cakeSize("tiered", 10).tiers.length);
});

test("a dessert box has no tiers to draw", () => {
  assert.deepEqual(cakeSize("desserts", 12).tiers, []);
});
