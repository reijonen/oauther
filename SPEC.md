# Oauther Service Specification

## Purpose

`oauther` is an edge authentication microservice for nginx `auth_request`.
It validates OAuth/OIDC bearer tokens issued by Auth0 and returns status-only authorization decisions.
Active runtime implementation is Node.js + TypeScript.

Legacy note:
- Previous Go implementation is archived under `oauther/legacy-go/` for rollback/reference.

Primary use:
- nginx protects `/mcp` by calling `oauther` as a subrequest.
- If token validation succeeds, nginx forwards to MCP upstream.
- If validation fails, nginx denies the request.

## Trust Boundaries

- Public clients do **not** call `oauther` directly in normal operation.
- nginx calls `oauther` over internal Docker network.
- `oauther` trusts Auth0 JWKS for signature verification.
- `oauther` trusts nginx-provided `X-Real-IP` for deny-rate limiter client identity.
- Local MCP server remains auth-agnostic; auth is enforced at edge.

## Endpoints

### `GET /auth`

Auth decision endpoint for nginx `auth_request`.

Input:
- Header: `Authorization: Bearer <token>`

Behavior:
- Requires bearer token in `Authorization` header.
- Verifies JWT signature using Auth0 JWKS (`https://<AUTH0_DOMAIN>/.well-known/jwks.json`).
- Verifies claims:
  - `iss == https://<AUTH0_DOMAIN>/`
  - `aud` contains `AUTH0_AUDIENCE`
  - token is not expired (`exp`)
  - token is valid for current time (`nbf`, if present)
- If `AUTH_REQUIRED_SCOPE` is set, all required scopes must exist in `scope` claim.

Output:
- `204 No Content`: token accepted.
- `401 Unauthorized`: token missing, malformed, invalid, expired, issuer/audience mismatch.
  - Includes `WWW-Authenticate` challenge with `resource_metadata`.
  - Includes `scope` when `AUTH_REQUIRED_SCOPE` is configured.
- `403 Forbidden`: token valid but missing required scope(s).
  - Includes `WWW-Authenticate` with `error="insufficient_scope"`, `scope`, and `resource_metadata`.
- `405 Method Not Allowed`: non-`GET` methods.

Response body:
- No body is required or relied upon by nginx.

### `GET /healthz`

Health endpoint for internal checks.

Output:
- `200 OK`

### `GET /.well-known/oauth-protected-resource`

OAuth protected-resource metadata endpoint for discovery.

Input:
- Uses `RESOURCE_BASE_URL` for `resource` value (canonical, fixed).

Output:
- `200 OK` JSON:
  - `resource`: `RESOURCE_BASE_URL`
  - `authorization_servers`: `[ "https://<AUTH0_DOMAIN>/" ]`
  - `scopes_supported`: parsed from `AUTH_REQUIRED_SCOPE` (space-split; empty list when unset)
- `405 Method Not Allowed`: non-`GET` methods.

## Configuration Inputs (Environment Variables)

- `AUTH0_DOMAIN` (required)
  - Example: `dev-a3w68vmul5xc13me.eu.auth0.com`
- `AUTH0_AUDIENCE` (required)
  - Example: `https://samulireijonen.com`
- `AUTH_REQUIRED_SCOPE` (optional)
  - Space-separated required scopes.
  - Empty/unset disables scope enforcement.
- `RESOURCE_BASE_URL` (required)
  - Canonical protected resource URL (must be `https://...`).
  - Example: `https://samulireijonen.com`
- `JWT_CLOCK_SKEW_SECONDS` (optional, default `60`)
  - Non-negative integer leeway for clock differences.
- `JWT_HTTP_TIMEOUT_MS` (optional, default `3000`)
- `JWT_JWKS_CACHE_MAX_AGE_MS` (optional, default `600000`)
- `JWT_JWKS_COOLDOWN_MS` (optional, default `30000`)
- `AUTH_HEADER_MAX_BYTES` (optional, default `8192`)
  - Maximum accepted `Authorization` header size on `/auth`.
- `NODE_MAX_HTTP_HEADER_SIZE_BYTES` (optional, default `16384`)
  - Passed to Node runtime as `--max-http-header-size`.
  - Must be greater than or equal to `AUTH_HEADER_MAX_BYTES`.
- `AUTH_DECISION_TIMEOUT_MS` (optional, default `5000`)
  - Upper bound for auth decision evaluation.
- `AUTH_DENY_RATE_WINDOW_MS` (optional, default `60000`)
  - Sliding window for deny-rate limiting.
- `AUTH_DENY_RATE_MAX` (optional, default `120`)
  - Maximum deny decisions per client key inside rate-limit window.
- `HTTP_HEADERS_TIMEOUT_MS` (optional, default `15000`)
- `HTTP_REQUEST_TIMEOUT_MS` (optional, default `15000`)
- `HTTP_KEEP_ALIVE_TIMEOUT_MS` (optional, default `5000`)
- `LISTEN_ADDR` (optional, default `:8080`)
  - Node runtime accepts `LISTEN_ADDR` in `:<port>` format.

## Nginx Integration Contract

Expected nginx wiring:
- Internal auth subrequest:
  - `/_auth` -> `http://oauther:8080/auth`
- Protected resource:
  - `/mcp` uses `auth_request /_auth`
- Discovery route:
  - `/.well-known/oauth-protected-resource` -> `http://oauther:8080/.well-known/oauth-protected-resource`

nginx decision rule:
- Any 2xx from `/auth` => allow upstream.
- `401/403` from `/auth` => deny request.

Proxy identity rule:
- nginx must set `X-Real-IP` on `/_auth` subrequests.
- `oauther` rate limiting uses `X-Real-IP` first, then `req.ip`, then `unknown`.
- `X-Forwarded-For` is not used for limiter identity.

## Non-Goals

- Issuing tokens (no `/oauth/token` behavior).
- Acting as OAuth authorization server.
- Session storage or user profile APIs.
- Cookie-based auth (header-only bearer token in current version).

## Local Validation Runbook (Current Required Practice)

These checks are expected during release validation even before a full automated harness exists.

JWKS chaos/rotation checks:
- Simulate JWKS fetch failure/timeout and confirm `/auth` returns fail-closed `401`.
- Simulate signing-key rotation (`kid` old->new) and confirm:
  - old/stale key path fails closed with `401`
  - new key path recovers to `204` after JWKS refresh/cooldown window
  - no `oauther` restart is required for recovery.
- Confirm logs show deny reasons consistent with fault type during chaos windows.

nginx end-to-end auth propagation checks:
- `/mcp` without token -> `401` and `WWW-Authenticate` present.
- `/mcp` invalid token -> `401`.
- `/mcp` missing required scope -> `403` with `insufficient_scope`.
- `/mcp` valid token -> request is proxied upstream.

## What Still Needs To Be Done For Full Functionality

The following are external control-plane and deployment tasks outside `oauther` code:

- Configure Auth0 application as user-interactive OAuth (not Machine-to-Machine).
- Ensure Auth0 authorization server metadata exposes `registration_endpoint`.
- Ensure PKCE `S256` is advertised in authorization server metadata.
- Ensure dynamic client registration is enabled for ChatGPT onboarding flow.
- Configure Auth0 to honor/echo OAuth `resource` into issued token audience so it matches `AUTH0_AUDIENCE`.
- Allowlist ChatGPT connector redirect URI: `https://chatgpt.com/connector/oauth/{callback_id}`.
- Ensure TLS/mTLS and public DNS for `https://samulireijonen.com` are operational from OpenAI.
- Ensure firewall/panel policy matches nginx exposure (`443` live, and `80` policy aligned with HTTP-01 usage).
- Run end-to-end onboarding test in ChatGPT “Add app” and confirm tokenized `/mcp` requests appear in logs.

## Full Hardness Backlog (Not Implemented Yet)

- Build a full automated integration harness (nginx + oauther + controllable JWKS test issuer).
- Add CI chaos matrix for JWKS timeout/failure/rotation/recovery scenarios.
- Add CI end-to-end nginx `auth_request` assertions for `WWW-Authenticate` propagation and `401/403/204` behavior.
- Move deny-rate limiting to shared/distributed state for multi-instance deployments.
- Add optional trusted-proxy CIDR policy mode for future multi-proxy topologies.
- Add production alerting pipeline for deny spikes and internal verifier failures.
