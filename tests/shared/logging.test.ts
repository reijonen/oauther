import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";

import { logAuthEvent } from "../../src/shared/logging.js";

function makeLoggingApp(reason: string): express.Express {
  const app = express();
  app.get("/log", (req, res) => {
    logAuthEvent(req, {
      outcome: "deny",
      reason,
      status: 401,
    });
    res.sendStatus(204);
  });
  return app;
}

test("logAuthEvent writes non-internal denials to console.info with request id", async (t) => {
  const infoMock = t.mock.method(console, "info");
  const errorMock = t.mock.method(console, "error");
  const app = makeLoggingApp("missing_or_malformed_bearer");

  const res = await request(app).get("/log").set("x-request-id", "req-123");
  assert.equal(res.status, 204);
  assert.equal(infoMock.mock.callCount(), 1);
  assert.equal(errorMock.mock.callCount(), 0);

  const firstCall = infoMock.mock.calls[0];
  if (!firstCall) {
    assert.fail("expected one console.info call");
  } else {
    const firstArg = firstCall.arguments[0];
    assert.equal(typeof firstArg, "string");
    if (typeof firstArg !== "string") {
      assert.fail("expected serialized log payload to be string");
    } else {
      assert.match(firstArg, /"request_id":"req-123"/);
      assert.match(firstArg, /"reason":"missing_or_malformed_bearer"/);
      assert.match(firstArg, /"path":"\/log"/);
    }
  }
});

test("logAuthEvent writes internal faults to console.error and defaults request id", async (t) => {
  const infoMock = t.mock.method(console, "info");
  const errorMock = t.mock.method(console, "error");
  const app = makeLoggingApp("internal_verifier_failure");

  const res = await request(app).get("/log");
  assert.equal(res.status, 204);
  assert.equal(infoMock.mock.callCount(), 0);
  assert.equal(errorMock.mock.callCount(), 1);

  const firstCall = errorMock.mock.calls[0];
  if (!firstCall) {
    assert.fail("expected one console.error call");
  } else {
    const firstArg = firstCall.arguments[0];
    assert.equal(typeof firstArg, "string");
    if (typeof firstArg !== "string") {
      assert.fail("expected serialized log payload to be string");
    } else {
      assert.match(firstArg, /"request_id":"none"/);
      assert.match(firstArg, /"reason":"internal_verifier_failure"/);
      assert.match(firstArg, /"path":"\/log"/);
    }
  }
});
