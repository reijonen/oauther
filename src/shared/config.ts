import type { Config } from "./config-types.js";

const DEFAULT_LISTEN_PORT = 8080;
const DEFAULT_JWT_CLOCK_SKEW_SECONDS = 60;
const DEFAULT_JWT_HTTP_TIMEOUT_MS = 3000;
const DEFAULT_JWT_JWKS_CACHE_MAX_AGE_MS = 600000;
const DEFAULT_JWT_JWKS_COOLDOWN_MS = 30000;
const DEFAULT_NODE_MAX_HTTP_HEADER_SIZE_BYTES = 16384;
const DEFAULT_AUTH_HEADER_MAX_BYTES = 8192;
const DEFAULT_AUTH_DECISION_TIMEOUT_MS = 5000;
const DEFAULT_AUTH_DENY_RATE_WINDOW_MS = 60000;
const DEFAULT_AUTH_DENY_RATE_MAX = 120;
const DEFAULT_HTTP_HEADERS_TIMEOUT_MS = 15000;
const DEFAULT_HTTP_REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_HTTP_KEEP_ALIVE_TIMEOUT_MS = 5000;

function toNonEmpty(value?: string): string {
  return (value ?? "").trim();
}

function parseHttpsUrl(value: string, fieldName: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${fieldName} must be a valid https URL, got "${value}"`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${fieldName} must use https, got "${value}"`);
  }
  if (!parsed.host) {
    throw new Error(`${fieldName} must include host, got "${value}"`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`${fieldName} must not include query or fragment, got "${value}"`);
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed;
}

function parseNonNegativeInteger(raw: string, fieldName: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer, got "${raw}"`);
  } else {
    return parsed;
  }
}

function parsePositiveInteger(raw: string, fieldName: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer, got "${raw}"`);
  } else {
    return parsed;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const auth0Domain = toNonEmpty(env.AUTH0_DOMAIN);
  const auth0Audience = toNonEmpty(env.AUTH0_AUDIENCE);
  const resourceBaseUrlRaw = toNonEmpty(env.RESOURCE_BASE_URL);
  const requiredScope = toNonEmpty(env.AUTH_REQUIRED_SCOPE);
  const jwtClockSkewRaw =
    toNonEmpty(env.JWT_CLOCK_SKEW_SECONDS) || String(DEFAULT_JWT_CLOCK_SKEW_SECONDS);
  const jwtHttpTimeoutRaw =
    toNonEmpty(env.JWT_HTTP_TIMEOUT_MS) || String(DEFAULT_JWT_HTTP_TIMEOUT_MS);
  const jwtJwksCacheMaxAgeRaw =
    toNonEmpty(env.JWT_JWKS_CACHE_MAX_AGE_MS) || String(DEFAULT_JWT_JWKS_CACHE_MAX_AGE_MS);
  const jwtJwksCooldownRaw =
    toNonEmpty(env.JWT_JWKS_COOLDOWN_MS) || String(DEFAULT_JWT_JWKS_COOLDOWN_MS);
  const nodeMaxHttpHeaderSizeBytesRaw =
    toNonEmpty(env.NODE_MAX_HTTP_HEADER_SIZE_BYTES) ||
    String(DEFAULT_NODE_MAX_HTTP_HEADER_SIZE_BYTES);
  const authHeaderMaxBytesRaw =
    toNonEmpty(env.AUTH_HEADER_MAX_BYTES) || String(DEFAULT_AUTH_HEADER_MAX_BYTES);
  const authDecisionTimeoutRaw =
    toNonEmpty(env.AUTH_DECISION_TIMEOUT_MS) || String(DEFAULT_AUTH_DECISION_TIMEOUT_MS);
  const authDenyRateWindowRaw =
    toNonEmpty(env.AUTH_DENY_RATE_WINDOW_MS) || String(DEFAULT_AUTH_DENY_RATE_WINDOW_MS);
  const authDenyRateMaxRaw =
    toNonEmpty(env.AUTH_DENY_RATE_MAX) || String(DEFAULT_AUTH_DENY_RATE_MAX);
  const httpHeadersTimeoutRaw =
    toNonEmpty(env.HTTP_HEADERS_TIMEOUT_MS) || String(DEFAULT_HTTP_HEADERS_TIMEOUT_MS);
  const httpRequestTimeoutRaw =
    toNonEmpty(env.HTTP_REQUEST_TIMEOUT_MS) || String(DEFAULT_HTTP_REQUEST_TIMEOUT_MS);
  const httpKeepAliveTimeoutRaw =
    toNonEmpty(env.HTTP_KEEP_ALIVE_TIMEOUT_MS) || String(DEFAULT_HTTP_KEEP_ALIVE_TIMEOUT_MS);
  const listenAddr = toNonEmpty(env.LISTEN_ADDR);

  if (!auth0Domain) throw new Error("AUTH0_DOMAIN is required");
  if (!auth0Audience) throw new Error("AUTH0_AUDIENCE is required");
  if (!resourceBaseUrlRaw) throw new Error("RESOURCE_BASE_URL is required");

  const jwtClockSkewSeconds = parseNonNegativeInteger(jwtClockSkewRaw, "JWT_CLOCK_SKEW_SECONDS");
  const jwtHttpTimeoutMs = parseNonNegativeInteger(jwtHttpTimeoutRaw, "JWT_HTTP_TIMEOUT_MS");
  const jwtJwksCacheMaxAgeMs = parseNonNegativeInteger(
    jwtJwksCacheMaxAgeRaw,
    "JWT_JWKS_CACHE_MAX_AGE_MS",
  );
  const jwtJwksCooldownMs = parseNonNegativeInteger(jwtJwksCooldownRaw, "JWT_JWKS_COOLDOWN_MS");
  const nodeMaxHttpHeaderSizeBytes = parsePositiveInteger(
    nodeMaxHttpHeaderSizeBytesRaw,
    "NODE_MAX_HTTP_HEADER_SIZE_BYTES",
  );
  const authHeaderMaxBytes = parsePositiveInteger(authHeaderMaxBytesRaw, "AUTH_HEADER_MAX_BYTES");
  const authDecisionTimeoutMs = parsePositiveInteger(
    authDecisionTimeoutRaw,
    "AUTH_DECISION_TIMEOUT_MS",
  );
  const authDenyRateWindowMs = parsePositiveInteger(
    authDenyRateWindowRaw,
    "AUTH_DENY_RATE_WINDOW_MS",
  );
  const authDenyRateMax = parsePositiveInteger(authDenyRateMaxRaw, "AUTH_DENY_RATE_MAX");
  const httpHeadersTimeoutMs = parsePositiveInteger(
    httpHeadersTimeoutRaw,
    "HTTP_HEADERS_TIMEOUT_MS",
  );
  const httpRequestTimeoutMs = parsePositiveInteger(
    httpRequestTimeoutRaw,
    "HTTP_REQUEST_TIMEOUT_MS",
  );
  const httpKeepAliveTimeoutMs = parsePositiveInteger(
    httpKeepAliveTimeoutRaw,
    "HTTP_KEEP_ALIVE_TIMEOUT_MS",
  );
  if (authHeaderMaxBytes > nodeMaxHttpHeaderSizeBytes) {
    throw new Error(
      "AUTH_HEADER_MAX_BYTES must be less than or equal to NODE_MAX_HTTP_HEADER_SIZE_BYTES",
    );
  }

  const resourceBaseUrl = parseHttpsUrl(resourceBaseUrlRaw, "RESOURCE_BASE_URL");
  const normalizedAuth0Domain = auth0Domain.replace(/\/+$/, "");
  const issuerUrl = `https://${normalizedAuth0Domain}/`;
  const requiredScopes = requiredScope ? requiredScope.split(/\s+/).filter(Boolean) : [];

  let listenPort = DEFAULT_LISTEN_PORT;
  if (listenAddr) {
    const match = listenAddr.match(/^:([0-9]{1,5})$/);
    if (!match) {
      throw new Error(`LISTEN_ADDR must be in format :<port>, got "${listenAddr}"`);
    }
    const portString = match[1];
    if (!portString) {
      throw new Error(`LISTEN_ADDR must include a port, got "${listenAddr}"`);
    }
    listenPort = Number.parseInt(portString, 10);
    if (listenPort < 1 || listenPort > 65535) {
      throw new Error(`LISTEN_ADDR port must be in range 1-65535, got "${listenAddr}"`);
    }
  }

  const normalizedResourceBaseUrl = resourceBaseUrl.toString().replace(/\/+$/, "");
  return {
    auth0Domain: normalizedAuth0Domain,
    auth0Audience,
    resourceBaseUrl: normalizedResourceBaseUrl,
    resourceMetadataUrl: `${normalizedResourceBaseUrl}/.well-known/oauth-protected-resource`,
    requiredScope,
    requiredScopes,
    issuerUrl,
    jwtClockSkewSeconds,
    jwtHttpTimeoutMs,
    jwtJwksCacheMaxAgeMs,
    jwtJwksCooldownMs,
    nodeMaxHttpHeaderSizeBytes,
    authHeaderMaxBytes,
    authDecisionTimeoutMs,
    authDenyRateWindowMs,
    authDenyRateMax,
    httpHeadersTimeoutMs,
    httpRequestTimeoutMs,
    httpKeepAliveTimeoutMs,
    listenPort,
  };
}
