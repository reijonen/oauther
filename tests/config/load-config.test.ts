import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../../src/server.js";
import { baseEnv } from "../helpers/test-app.js";

test("loadConfig validates required env", () => {
  assert.throws(() => loadConfig({ ...baseEnv, AUTH0_DOMAIN: "" }), /AUTH0_DOMAIN is required/);
  assert.throws(
    () => loadConfig({ ...baseEnv, AUTH0_AUDIENCE: "" }),
    /AUTH0_AUDIENCE is required/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, RESOURCE_BASE_URL: "http://example.com" }),
    /RESOURCE_BASE_URL must use https/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, LISTEN_ADDR: "8080" }),
    /LISTEN_ADDR must be in format :<port>/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, LISTEN_ADDR: ":0" }),
    /LISTEN_ADDR port must be in range 1-65535/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, LISTEN_ADDR: ":70000" }),
    /LISTEN_ADDR port must be in range 1-65535/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, RESOURCE_BASE_URL: "https://" }),
    /RESOURCE_BASE_URL must be a valid https URL/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, RESOURCE_BASE_URL: "https://samulireijonen.com/path?x=1" }),
    /RESOURCE_BASE_URL must not include query or fragment/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, RESOURCE_BASE_URL: "https://samulireijonen.com/path#frag" }),
    /RESOURCE_BASE_URL must not include query or fragment/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, JWT_HTTP_TIMEOUT_MS: "abc" }),
    /JWT_HTTP_TIMEOUT_MS must be a non-negative integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, AUTH_HEADER_MAX_BYTES: "0" }),
    /AUTH_HEADER_MAX_BYTES must be a positive integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, NODE_MAX_HTTP_HEADER_SIZE_BYTES: "0" }),
    /NODE_MAX_HTTP_HEADER_SIZE_BYTES must be a positive integer/,
  );
  assert.throws(
    () =>
      loadConfig({
        ...baseEnv,
        AUTH_HEADER_MAX_BYTES: "9000",
        NODE_MAX_HTTP_HEADER_SIZE_BYTES: "8000",
      }),
    /AUTH_HEADER_MAX_BYTES must be less than or equal to NODE_MAX_HTTP_HEADER_SIZE_BYTES/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, AUTH_DECISION_TIMEOUT_MS: "0" }),
    /AUTH_DECISION_TIMEOUT_MS must be a positive integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, AUTH_DENY_RATE_WINDOW_MS: "0" }),
    /AUTH_DENY_RATE_WINDOW_MS must be a positive integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, AUTH_DENY_RATE_MAX: "0" }),
    /AUTH_DENY_RATE_MAX must be a positive integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, HTTP_HEADERS_TIMEOUT_MS: "0" }),
    /HTTP_HEADERS_TIMEOUT_MS must be a positive integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, HTTP_REQUEST_TIMEOUT_MS: "0" }),
    /HTTP_REQUEST_TIMEOUT_MS must be a positive integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, HTTP_KEEP_ALIVE_TIMEOUT_MS: "0" }),
    /HTTP_KEEP_ALIVE_TIMEOUT_MS must be a positive integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, JWT_CLOCK_SKEW_SECONDS: "-1" }),
    /JWT_CLOCK_SKEW_SECONDS must be a non-negative integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, JWT_HTTP_TIMEOUT_MS: "-1" }),
    /JWT_HTTP_TIMEOUT_MS must be a non-negative integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, JWT_JWKS_CACHE_MAX_AGE_MS: "-1" }),
    /JWT_JWKS_CACHE_MAX_AGE_MS must be a non-negative integer/,
  );
  assert.throws(
    () => loadConfig({ ...baseEnv, JWT_JWKS_COOLDOWN_MS: "-1" }),
    /JWT_JWKS_COOLDOWN_MS must be a non-negative integer/,
  );
});

test("loadConfig applies defaults and parses verifier options", () => {
  const parsed = loadConfig({
    ...baseEnv,
    JWT_CLOCK_SKEW_SECONDS: "90",
    JWT_HTTP_TIMEOUT_MS: "1234",
    JWT_JWKS_CACHE_MAX_AGE_MS: "2345",
    JWT_JWKS_COOLDOWN_MS: "3456",
    NODE_MAX_HTTP_HEADER_SIZE_BYTES: "12288",
    AUTH_HEADER_MAX_BYTES: "4096",
    AUTH_DECISION_TIMEOUT_MS: "3210",
    AUTH_DENY_RATE_WINDOW_MS: "12345",
    AUTH_DENY_RATE_MAX: "42",
    HTTP_HEADERS_TIMEOUT_MS: "1111",
    HTTP_REQUEST_TIMEOUT_MS: "2222",
    HTTP_KEEP_ALIVE_TIMEOUT_MS: "3333",
    LISTEN_ADDR: ":9090",
  });

  assert.equal(parsed.jwtClockSkewSeconds, 90);
  assert.equal(parsed.jwtHttpTimeoutMs, 1234);
  assert.equal(parsed.jwtJwksCacheMaxAgeMs, 2345);
  assert.equal(parsed.jwtJwksCooldownMs, 3456);
  assert.equal(parsed.nodeMaxHttpHeaderSizeBytes, 12288);
  assert.equal(parsed.authHeaderMaxBytes, 4096);
  assert.equal(parsed.authDecisionTimeoutMs, 3210);
  assert.equal(parsed.authDenyRateWindowMs, 12345);
  assert.equal(parsed.authDenyRateMax, 42);
  assert.equal(parsed.httpHeadersTimeoutMs, 1111);
  assert.equal(parsed.httpRequestTimeoutMs, 2222);
  assert.equal(parsed.httpKeepAliveTimeoutMs, 3333);
  assert.equal(parsed.listenPort, 9090);
});

test("loadConfig normalizes trailing slashes in resource base url", () => {
  const parsed = loadConfig({
    ...baseEnv,
    RESOURCE_BASE_URL: "https://samulireijonen.com/mcp///",
  });

  assert.equal(parsed.resourceBaseUrl, "https://samulireijonen.com/mcp");
  assert.equal(
    parsed.resourceMetadataUrl,
    "https://samulireijonen.com/mcp/.well-known/oauth-protected-resource",
  );
});
