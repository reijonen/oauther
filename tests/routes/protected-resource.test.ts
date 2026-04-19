import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { makeApp } from "../helpers/test-app.js";

test("GET /.well-known/oauth-protected-resource returns canonical metadata", async () => {
  const app = makeApp(async () => ({ scope: "" }));
  const res = await request(app)
    .get("/.well-known/oauth-protected-resource")
    .set("Host", "evil.example.com");
  assert.equal(res.status, 200);
  assert.equal(res.body.resource, "https://samulireijonen.com");
  assert.deepEqual(res.body.authorization_servers, [
    "https://dev-a3w68vmul5xc13me.eu.auth0.com/",
  ]);
  assert.deepEqual(res.body.scopes_supported, []);
});

test("GET /.well-known/oauth-protected-resource returns scopes_supported", async () => {
  const app = makeApp(async () => ({ scope: "mcp:read" }), "mcp:read mcp:write");
  const res = await request(app).get("/.well-known/oauth-protected-resource");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.scopes_supported, ["mcp:read", "mcp:write"]);
});

test("non-GET metadata endpoint returns 405", async () => {
  const app = makeApp(async () => ({ scope: "mcp:read" }));
  const res = await request(app).post("/.well-known/oauth-protected-resource");
  assert.equal(res.status, 405);
});
