import assert from "node:assert/strict";
import { test } from "node:test";
import { RateLimiter } from "./ratelimit.ts";

test("allows up to the limit, then refuses until the window ends", () => {
  let time = 0;
  const limiter = new RateLimiter(2, 1000, () => time);
  assert.equal(limiter.allow("a"), true);
  assert.equal(limiter.allow("a"), true);
  assert.equal(limiter.allow("a"), false);
  assert.equal(limiter.allow("b"), true, "other keys are unaffected");
  time = 1000;
  assert.equal(limiter.allow("a"), true);
});

test("reset clears one key", () => {
  const limiter = new RateLimiter(1, 1000, () => 0);
  limiter.allow("a");
  assert.equal(limiter.allow("a"), false);
  limiter.reset("a");
  assert.equal(limiter.allow("a"), true);
});
