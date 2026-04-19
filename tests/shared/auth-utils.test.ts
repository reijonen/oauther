import assert from "node:assert/strict";
import test from "node:test";

import { extractBearerToken, hasRequiredScopes } from "../../src/shared/auth-utils.js";

test("extractBearerToken handles whitespace and valid bearer token", () => {
  assert.equal(extractBearerToken("  Bearer   abc.def  "), "abc.def");
});

test("extractBearerToken rejects missing and malformed values", () => {
  assert.equal(extractBearerToken(""), null);
  assert.equal(extractBearerToken("Basic token"), null);
  assert.equal(extractBearerToken("Bearer   "), null);
});

test("extractBearerToken is case-sensitive for Bearer scheme", () => {
  assert.equal(extractBearerToken("bearer token"), null);
});

test("hasRequiredScopes returns true when all required scopes are present", () => {
  assert.equal(hasRequiredScopes("mcp:read mcp:write", ["mcp:read"]), true);
  assert.equal(hasRequiredScopes("mcp:read mcp:write", ["mcp:read", "mcp:write"]), true);
});

test("hasRequiredScopes returns false when required scope is missing", () => {
  assert.equal(hasRequiredScopes("mcp:read", ["mcp:write"]), false);
});

test("hasRequiredScopes returns true when no required scopes configured", () => {
  assert.equal(hasRequiredScopes("anything", []), true);
});
