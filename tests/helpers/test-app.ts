import type { Express } from "express";

import { createApp, loadConfig } from "../../src/server.js";
import type { VerifyToken } from "../../src/shared/auth-types.js";

export const baseEnv = {
  AUTH0_DOMAIN: "dev-a3w68vmul5xc13me.eu.auth0.com",
  AUTH0_AUDIENCE: "https://samulireijonen.com",
  RESOURCE_BASE_URL: "https://samulireijonen.com",
  AUTH_REQUIRED_SCOPE: "",
  JWT_CLOCK_SKEW_SECONDS: "60",
  JWT_HTTP_TIMEOUT_MS: "3000",
  JWT_JWKS_CACHE_MAX_AGE_MS: "600000",
  JWT_JWKS_COOLDOWN_MS: "30000",
  NODE_MAX_HTTP_HEADER_SIZE_BYTES: "16384",
  AUTH_HEADER_MAX_BYTES: "8192",
  AUTH_DECISION_TIMEOUT_MS: "5000",
  AUTH_DENY_RATE_WINDOW_MS: "60000",
  AUTH_DENY_RATE_MAX: "120",
  HTTP_HEADERS_TIMEOUT_MS: "15000",
  HTTP_REQUEST_TIMEOUT_MS: "15000",
  HTTP_KEEP_ALIVE_TIMEOUT_MS: "5000",
};

export function makeApp(
  verifyToken: VerifyToken,
  requiredScope = "",
  envOverrides: Partial<typeof baseEnv> = {},
): Express {
  const config = loadConfig({
    ...baseEnv,
    ...envOverrides,
    AUTH_REQUIRED_SCOPE: requiredScope,
  });
  return createApp(config, verifyToken);
}
