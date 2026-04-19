import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { makeApp } from "../helpers/test-app.js";

test("GET /healthz returns 200", async () => {
  const app = makeApp(async () => ({ scope: "mcp:read" }));
  const res = await request(app).get("/healthz");
  assert.equal(res.status, 200);
});

test("x-powered-by header is disabled", async () => {
  const app = makeApp(async () => ({ scope: "mcp:read" }));
  const res = await request(app).get("/healthz");
  assert.ok(!("x-powered-by" in res.header));
});

test("non-GET /healthz returns 405", async () => {
  const app = makeApp(async () => ({ scope: "mcp:read" }));
  const res = await request(app).post("/healthz");
  assert.equal(res.status, 405);
});
