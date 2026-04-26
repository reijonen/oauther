# Oauther

Oauther is an edge authentication microservice for nginx `auth_request`. It validates Auth0-issued OAuth/OIDC bearer tokens and returns status-only authorization decisions so an upstream MCP service can remain auth-agnostic.

The active implementation is Node.js, TypeScript, and Express. A previous Go implementation is kept under `legacy-go/` for reference.

## High-Level Features

- **nginx edge authorization**: exposes `GET /auth` for nginx subrequests and returns `204` for accepted tokens, `401` for invalid or missing tokens, and `403` for valid tokens without required scopes.
- **Auth0 JWT validation**: verifies RS256 bearer tokens against Auth0 JWKS, including issuer, audience, expiry, not-before time, and configurable clock skew.
- **Optional scope enforcement**: supports space-separated required scopes through `AUTH_REQUIRED_SCOPE`.
- **OAuth protected-resource discovery**: serves `/.well-known/oauth-protected-resource` with the canonical resource URL, Auth0 issuer, and supported scopes.
- **Fail-closed verifier behavior**: treats verification failures, JWKS errors, malformed tokens, and auth decision timeouts as deny decisions.
- **Deny rate limiting**: applies an in-memory deny-rate limiter keyed primarily by nginx-provided `X-Real-IP`.
- **Header and timeout controls**: includes configurable authorization header size limits, JWT HTTP timeout, JWKS cache/cooldown timings, and HTTP server timeouts.
- **Container-ready deployment**: includes a multi-stage Dockerfile and `compose.oauther.yml` for running the service in a containerized edge stack.
- **Focused automated tests**: covers routes, configuration parsing, Auth0 verifier behavior, challenge headers, rate limiting, logging, and type boundaries.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/auth` | nginx auth decision endpoint for bearer token validation. |
| `GET` | `/healthz` | Internal health check endpoint. |
| `GET` | `/.well-known/oauth-protected-resource` | OAuth protected-resource metadata discovery. |

Non-`GET` requests to these routes return `405 Method Not Allowed`.

## Configuration

Required environment variables:

- `AUTH0_DOMAIN`: Auth0 tenant domain, without protocol.
- `AUTH0_AUDIENCE`: expected JWT audience.
- `RESOURCE_BASE_URL`: canonical HTTPS URL for the protected resource.

Optional environment variables:

- `AUTH_REQUIRED_SCOPE`: space-separated scopes required for authorization.
- `JWT_CLOCK_SKEW_SECONDS`: token time validation leeway, default `60`.
- `JWT_HTTP_TIMEOUT_MS`: JWKS HTTP timeout, default `3000`.
- `JWT_JWKS_CACHE_MAX_AGE_MS`: JWKS cache max age, default `600000`.
- `JWT_JWKS_COOLDOWN_MS`: JWKS refresh cooldown, default `30000`.
- `AUTH_HEADER_MAX_BYTES`: maximum accepted `Authorization` header size, default `8192`.
- `NODE_MAX_HTTP_HEADER_SIZE_BYTES`: Node HTTP header size limit, default `16384`.
- `AUTH_DECISION_TIMEOUT_MS`: maximum auth decision duration, default `5000`.
- `AUTH_DENY_RATE_WINDOW_MS`: deny-rate limiter window, default `60000`.
- `AUTH_DENY_RATE_MAX`: maximum deny decisions per client per window, default `120`.
- `HTTP_HEADERS_TIMEOUT_MS`: Node headers timeout, default `15000`.
- `HTTP_REQUEST_TIMEOUT_MS`: Node request timeout, default `15000`.
- `HTTP_KEEP_ALIVE_TIMEOUT_MS`: Node keep-alive timeout, default `5000`.
- `LISTEN_ADDR`: listen address in `:<port>` format, default `:8080`.

## Deployment Contract

In the intended deployment, nginx protects `/mcp` with `auth_request`, calls Oauther internally at `/auth`, and forwards successful requests to the MCP upstream. Public clients should not normally call Oauther directly.

nginx should set `X-Real-IP` on auth subrequests because Oauther uses it as the primary client identity for deny-rate limiting.
