import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, daysBetween, isValidDay, monthGrid, refuseDate, tbilisiToday, type AvailabilityRules } from "./dates.ts";

const rules: AvailabilityRules = {
  leadDays: 3,
  horizonDays: 120,
  capacityPerDay: 2,
  blocked: ["2026-12-31"],
  orderCounts: { "2026-12-20": 2, "2026-12-21": 1 },
};
const today = "2026-12-01";

test("today is the Tbilisi calendar day, not the UTC one", () => {
  // 21:30 UTC is already 01:30 the next day at UTC+4.
  assert.equal(tbilisiToday(new Date("2026-12-01T21:30:00Z")), "2026-12-02");
  assert.equal(tbilisiToday(new Date("2026-12-01T19:30:00Z")), "2026-12-01");
});

test("rejects impossible dates", () => {
  assert.equal(isValidDay("2026-02-30"), false);
  assert.equal(isValidDay("26-2-3"), false);
  assert.equal(refuseDate("not-a-date", rules, today), "invalid");
});

test("the past and the lead time are refused; the first allowed day is today plus lead days", () => {
  assert.equal(refuseDate("2026-11-30", rules, today), "past");
  assert.equal(refuseDate("2026-12-01", rules, today), "leadTime");
  assert.equal(refuseDate("2026-12-03", rules, today), "leadTime");
  assert.equal(refuseDate("2026-12-04", rules, today), null);
});

test("blocked and full days are refused, a day with room is not", () => {
  assert.equal(refuseDate("2026-12-31", rules, today), "blocked");
  assert.equal(refuseDate("2026-12-20", rules, today), "full");
  assert.equal(refuseDate("2026-12-21", rules, today), null);
});

test("days beyond the horizon are refused", () => {
  assert.equal(refuseDate(addDays(today, 121), rules, today), "tooFar");
  assert.equal(refuseDate(addDays(today, 120), rules, today), null);
});

test("day arithmetic crosses month and year ends", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysBetween("2026-12-31", "2027-01-02"), 2);
});

test("month grid starts on Monday and has full weeks", () => {
  const november2026 = monthGrid(2026, 11);
  // 1 November 2026 is a Sunday, so six empty cells come first.
  assert.deepEqual(november2026[0], [null, null, null, null, null, null, "2026-11-01"]);
  assert.ok(november2026.every((row) => row.length === 7));
  assert.equal(november2026.flat().filter(Boolean).length, 30);
});
