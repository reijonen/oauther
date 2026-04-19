import assert from "node:assert/strict";
import test from "node:test";

import { buildChallenge } from "../../src/shared/challenge.js";
import type { Config } from "../../src/shared/config-types.js";

const baseConfig: Config = {
  auth0Domain: "dev-a3w68vmul5xc13me.eu.auth0.com",
  auth0Audience: "https://samulireijonen.com",
  resourceBaseUrl: "https://samulireijonen.com",
  resourceMetadataUrl: "https://samulireijonen.com/.well-known/oauth-protected-resource",
  requiredScope: "mcp:read mcp:write",
  requiredScopes: ["mcp:read", "mcp:write"],
  issuerUrl: "https://dev-a3w68vmul5xc13me.eu.auth0.com/",
  jwtClockSkewSeconds: 60,
  jwtHttpTimeoutMs: 3000,
  jwtJwksCacheMaxAgeMs: 600000,
  jwtJwksCooldownMs: 30000,
  nodeMaxHttpHeaderSizeBytes: 16384,
  authHeaderMaxBytes: 8192,
  authDecisionTimeoutMs: 5000,
  authDenyRateWindowMs: 60000,
  authDenyRateMax: 120,
  httpHeadersTimeoutMs: 15000,
  httpRequestTimeoutMs: 15000,
  httpKeepAliveTimeoutMs: 5000,
  listenPort: 8080,
};

test("buildChallenge without error or scope", () => {
  const value = buildChallenge(baseConfig);
  assert.equal(
    value,
    'Bearer resource_metadata="https://samulireijonen.com/.well-known/oauth-protected-resource"',
  );
});

test("buildChallenge with error and scope", () => {
  const value = buildChallenge(baseConfig, "insufficient_scope", true);
  assert.equal(
    value,
    'Bearer error="insufficient_scope", resource_metadata="https://samulireijonen.com/.well-known/oauth-protected-resource", scope="mcp:read mcp:write"',
  );
});

test("buildChallenge omits scope when none configured", () => {
  const value = buildChallenge(
    {
      ...baseConfig,
      requiredScope: "",
      requiredScopes: [],
    },
    "",
    true,
  );
  assert.equal(
    value,
    'Bearer resource_metadata="https://samulireijonen.com/.well-known/oauth-protected-resource"',
  );
});
