import assert from "node:assert/strict";
import test from "node:test";

import { DenyRateLimiter } from "../../src/shared/rate-limiter.js";

test("DenyRateLimiter limits after max denies in active window", () => {
  const limiter = new DenyRateLimiter(1000, 2);
  const now = 10000;

  assert.equal(limiter.isLimited("k", now), false);
  limiter.registerDeny("k", now);
  assert.equal(limiter.isLimited("k", now + 1), false);
  limiter.registerDeny("k", now + 2);
  assert.equal(limiter.isLimited("k", now + 3), true);
});

test("DenyRateLimiter clears expired windows", () => {
  const limiter = new DenyRateLimiter(1000, 1);
  const now = 10000;

  limiter.registerDeny("k", now);
  assert.equal(limiter.isLimited("k", now + 10), true);
  assert.equal(limiter.isLimited("k", now + 1200), false);
});
