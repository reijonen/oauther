import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { AuthVerificationError, InternalVerificationError } from "../../src/shared/errors.js";
import { makeApp } from "../helpers/test-app.js";

test("GET /auth missing Authorization -> 401 with resource_metadata", async () => {
  const app = makeApp(async () => ({ scope: "" }));
  const res = await request(app).get("/auth");
  assert.equal(res.status, 401);
  const challenge = res.header["www-authenticate"] ?? "";
  assert.match(
    challenge,
    /resource_metadata="https:\/\/samulireijonen\.com\/\.well-known\/oauth-protected-resource"/,
  );
});

test("GET /auth malformed Authorization -> 401", async () => {
  const app = makeApp(async () => ({ scope: "" }));
  const res = await request(app).get("/auth").set("Authorization", "Basic abc");
  assert.equal(res.status, 401);
});

test("GET /auth missing Authorization includes configured scope in challenge", async () => {
  const app = makeApp(async () => ({ scope: "" }), "mcp:read");
  const res = await request(app).get("/auth");
  assert.equal(res.status, 401);
  const challenge = res.header["www-authenticate"] ?? "";
  assert.match(challenge, /scope="mcp:read"/);
});

test("GET /auth verifier error -> 401", async () => {
  const app = makeApp(async () => {
    throw new Error("bad token");
  });
  const res = await request(app).get("/auth").set("Authorization", "Bearer invalid");
  assert.equal(res.status, 401);
});

test("GET /auth auth verification failure -> 401", async () => {
  const app = makeApp(async () => {
    throw new AuthVerificationError("invalid_token");
  });
  const res = await request(app).get("/auth").set("Authorization", "Bearer invalid");
  assert.equal(res.status, 401);
});

test("GET /auth internal verifier failure -> 401", async () => {
  const app = makeApp(async () => {
    throw new InternalVerificationError("verifier_fault");
  });
  const res = await request(app).get("/auth").set("Authorization", "Bearer invalid");
  assert.equal(res.status, 401);
});

test("GET /auth valid token -> 204", async () => {
  const app = makeApp(async () => ({ scope: "mcp:read" }));
  const res = await request(app).get("/auth").set("Authorization", "Bearer valid-token");
  assert.equal(res.status, 204);
});

test("GET /auth missing required scope -> 403 with insufficient_scope", async () => {
  const app = makeApp(async () => ({ scope: "mcp:write" }), "mcp:read");
  const res = await request(app).get("/auth").set("Authorization", "Bearer valid-token");
  assert.equal(res.status, 403);
  const challenge = res.header["www-authenticate"] ?? "";
  assert.match(challenge, /error="insufficient_scope"/);
  assert.match(challenge, /scope="mcp:read"/);
  assert.match(
    challenge,
    /resource_metadata="https:\/\/samulireijonen\.com\/\.well-known\/oauth-protected-resource"/,
  );
});

test("non-GET /auth returns 405", async () => {
  const app = makeApp(async () => ({ scope: "mcp:read" }));
  const authRes = await request(app).post("/auth");
  assert.equal(authRes.status, 405);
});

test("GET /auth with oversized authorization header -> 401", async () => {
  const app = makeApp(
    async () => ({ scope: "mcp:read" }),
    "",
    {
      AUTH_HEADER_MAX_BYTES: "16",
    },
  );
  const res = await request(app).get("/auth").set("Authorization", "Bearer this-token-is-way-too-long");
  assert.equal(res.status, 401);
});

test("GET /auth rate limits repeated deny attempts -> 401", async () => {
  const app = makeApp(
    async () => ({ scope: "mcp:read" }),
    "",
    {
      AUTH_DENY_RATE_MAX: "2",
      AUTH_DENY_RATE_WINDOW_MS: "60000",
    },
  );

  const deny1 = await request(app).get("/auth").set("Authorization", "Basic invalid");
  assert.equal(deny1.status, 401);
  const deny2 = await request(app).get("/auth").set("Authorization", "Basic invalid");
  assert.equal(deny2.status, 401);
  const deny3 = await request(app).get("/auth").set("Authorization", "Basic invalid");
  assert.equal(deny3.status, 401);

  const challenge = deny3.header["www-authenticate"] ?? "";
  assert.match(
    challenge,
    /resource_metadata="https:\/\/samulireijonen\.com\/\.well-known\/oauth-protected-resource"/,
  );
});

test("GET /auth rate limiter keys on X-Real-IP and ignores X-Forwarded-For", async () => {
  const app = makeApp(
    async () => ({ scope: "mcp:read" }),
    "",
    {
      AUTH_DENY_RATE_MAX: "2",
      AUTH_DENY_RATE_WINDOW_MS: "60000",
    },
  );

  const deny1 = await request(app)
    .get("/auth")
    .set("Authorization", "Basic invalid")
    .set("X-Real-IP", "203.0.113.10")
    .set("X-Forwarded-For", "198.51.100.1");
  assert.equal(deny1.status, 401);

  const deny2 = await request(app)
    .get("/auth")
    .set("Authorization", "Basic invalid")
    .set("X-Real-IP", "203.0.113.10")
    .set("X-Forwarded-For", "198.51.100.2");
  assert.equal(deny2.status, 401);

  const deny3 = await request(app)
    .get("/auth")
    .set("Authorization", "Basic invalid")
    .set("X-Real-IP", "203.0.113.10")
    .set("X-Forwarded-For", "198.51.100.3");
  assert.equal(deny3.status, 401);
});

test("GET /auth rate limiter falls back when X-Real-IP is missing", async () => {
  const app = makeApp(
    async () => ({ scope: "mcp:read" }),
    "",
    {
      AUTH_DENY_RATE_MAX: "2",
      AUTH_DENY_RATE_WINDOW_MS: "60000",
    },
  );

  const deny1 = await request(app)
    .get("/auth")
    .set("Authorization", "Basic invalid")
    .set("X-Forwarded-For", "198.51.100.1");
  assert.equal(deny1.status, 401);

  const deny2 = await request(app)
    .get("/auth")
    .set("Authorization", "Basic invalid")
    .set("X-Forwarded-For", "198.51.100.2");
  assert.equal(deny2.status, 401);

  const deny3 = await request(app)
    .get("/auth")
    .set("Authorization", "Basic invalid")
    .set("X-Forwarded-For", "198.51.100.3");
  assert.equal(deny3.status, 401);
});
