import assert from "node:assert/strict";
import { test } from "node:test";
import { business } from "../config/business.ts";
import { estimatePrice, fact } from "./facts.ts";

const groups = {
  prices: business.prices,
  reviews: business.reviews,
  phone: business.phone,
  whatsapp: business.whatsapp,
  address: business.address,
  delivery: business.delivery,
  leadTime: business.leadTime,
  capacity: business.capacity,
};

test("an unconfirmed value is never returned for display", () => {
  assert.equal(fact({ confirmed: false, value: "secret" }), null);
  assert.equal(fact({ confirmed: true, value: "real" }), "real");
});

test("every group the owner has not confirmed reads as null", () => {
  for (const [name, group] of Object.entries(groups)) {
    if (!group.confirmed) assert.equal(fact(group as { confirmed: boolean; value: unknown }), null, name);
  }
});

test("no price is estimated from unconfirmed values, even if numbers are filled in", () => {
  const list = { tieredPerKg: 100, bentoEach: 50, dessertsPerGuest: 10 };
  assert.equal(estimatePrice({ confirmed: false, value: list }, "tiered", 2, 12), null);
  assert.equal(estimatePrice(business.prices, "tiered", 2, 12), null);
});

test("confirmed prices give a live estimate per format", () => {
  const prices = { confirmed: true, value: { tieredPerKg: 100, bentoEach: 50, dessertsPerGuest: 10 } };
  assert.equal(estimatePrice(prices, "tiered", 2.5, 16), 250);
  assert.equal(estimatePrice(prices, "bento", 0.5, 4), 50);
  assert.equal(estimatePrice(prices, "desserts", 1, 12), 120);
});

test("a price of zero means not set, not free", () => {
  const prices = { confirmed: true, value: { tieredPerKg: 0, bentoEach: 0, dessertsPerGuest: 0 } };
  assert.equal(estimatePrice(prices, "tiered", 2, 12), null);
});
