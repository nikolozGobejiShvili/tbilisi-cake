import assert from "node:assert/strict";
import { test } from "node:test";
import { isUpcoming, nextAnniversary } from "./occasions.ts";

test("the next anniversary is this year if it is still ahead, otherwise next year", () => {
  assert.equal(nextAnniversary("2025-12-20", "2026-11-01"), "2026-12-20");
  assert.equal(nextAnniversary("2025-03-10", "2026-11-01"), "2027-03-10");
  assert.equal(nextAnniversary("2025-11-01", "2026-11-01"), "2026-11-01");
});

test("29 February falls on the 28th outside leap years", () => {
  assert.equal(nextAnniversary("2024-02-29", "2026-01-01"), "2026-02-28");
  assert.equal(nextAnniversary("2024-02-29", "2028-01-01"), "2028-02-29");
});

test("only past orders inside the window count as upcoming occasions", () => {
  assert.equal(isUpcoming("2025-12-20", "2026-11-01", 60), true);
  assert.equal(isUpcoming("2025-03-10", "2026-11-01", 60), false);
  assert.equal(isUpcoming("2026-12-20", "2026-11-01", 60), false, "that order has not even happened yet");
});
