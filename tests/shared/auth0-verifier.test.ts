import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { AuthOptions } from "express-oauth2-jwt-bearer";
import { InvalidRequestError, InvalidTokenError, UnauthorizedError } from "express-oauth2-jwt-bearer";
import request from "supertest";

import { makeAuth0Verifier } from "../../src/shared/auth0-verifier.js";
import type { Config } from "../../src/shared/config-types.js";
import { AuthVerificationError, InternalVerificationError } from "../../src/shared/errors.js";
import type { ExpressMiddleware } from "../../src/shared/express-types.js";

function makeConfig(): Config {
  return {
    auth0Domain: "dev-a3w68vmul5xc13me.eu.auth0.com",
    auth0Audience: "https://samulireijonen.com",
    resourceBaseUrl: "https://samulireijonen.com",
    resourceMetadataUrl: "https://samulireijonen.com/.well-known/oauth-protected-resource",
    requiredScope: "mcp:read",
    requiredScopes: ["mcp:read"],
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
}

async function runVerifierWithMiddleware(middleware: ExpressMiddleware): Promise<{
  status: number;
  body: { scope?: string; errorName?: string; errorMessage?: string };
}> {
  const config = makeConfig();
  const verifier = makeAuth0Verifier(config, (_opts: AuthOptions) => middleware);
  const app = express();

  app.get("/verify", async (req, res) => {
    await verifier(req, res)
      .then((payload) => {
        res.status(200).json(payload);
      })
      .catch((error: Error) => {
        res.status(500).json({
          errorName: error.constructor.name,
          errorMessage: error.message,
        });
      });
  });

  const result = await request(app).get("/verify").set("Authorization", "Bearer token");
  return { status: result.status, body: result.body };
}

test("makeAuth0Verifier passes expected auth middleware options", async () => {
  const config = makeConfig();
  const capturedOptionsList: AuthOptions[] = [];
  const verifier = makeAuth0Verifier(config, (opts: AuthOptions) => {
    capturedOptionsList.push(opts);
    return (req, _res, next) => {
      req.auth = {
        header: { alg: "RS256" },
        payload: { scope: "mcp:read" },
        token: "token",
      };
      next();
    };
  });

  const app = express();
  app.get("/verify", async (req, res) => {
    const payload = await verifier(req, res);
    res.status(200).json(payload);
  });

  const result = await request(app).get("/verify").set("Authorization", "Bearer token");
  assert.equal(result.status, 200);
  assert.equal(result.body.scope, "mcp:read");
  if (capturedOptionsList.length === 0) {
    assert.fail("expected middleware options to be captured");
  } else {
    const capturedOptions = capturedOptionsList[0];
    if (!capturedOptions) {
      assert.fail("expected middleware options to exist at index 0");
    }
    assert.equal(capturedOptions.issuerBaseURL, "https://dev-a3w68vmul5xc13me.eu.auth0.com");
    assert.equal(capturedOptions.audience, "https://samulireijonen.com");
    assert.equal(capturedOptions.tokenSigningAlg, "RS256");
    assert.equal(capturedOptions.clockTolerance, 60);
    assert.equal(capturedOptions.timeoutDuration, 3000);
    assert.equal(capturedOptions.cacheMaxAge, 600000);
    assert.equal(capturedOptions.cooldownDuration, 30000);
  }
});

test("makeAuth0Verifier returns empty payload when scope claim is absent", async () => {
  const result = await runVerifierWithMiddleware((req, _res, next) => {
    req.auth = {
      header: { alg: "RS256" },
      payload: {},
      token: "token",
    };
    next();
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {});
});

test("makeAuth0Verifier maps auth failures to AuthVerificationError", async () => {
  const result = await runVerifierWithMiddleware((_req, _res, next) => {
    next(new UnauthorizedError("invalid_token"));
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.errorName, AuthVerificationError.name);
  assert.equal(result.body.errorMessage, "invalid_token");
});

test("makeAuth0Verifier maps invalid request failures to AuthVerificationError", async () => {
  const result = await runVerifierWithMiddleware((_req, _res, next) => {
    next(new InvalidRequestError("invalid_request"));
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.errorName, AuthVerificationError.name);
  assert.equal(result.body.errorMessage, "invalid_request");
});

test("makeAuth0Verifier maps invalid token failures to AuthVerificationError", async () => {
  const result = await runVerifierWithMiddleware((_req, _res, next) => {
    next(new InvalidTokenError("invalid_token"));
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.errorName, AuthVerificationError.name);
  assert.equal(result.body.errorMessage, "invalid_token");
});

class StatusCode401Error extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.statusCode = 401;
  }
}

class Status401Error extends Error {
  status: number;

  constructor(message: string) {
    super(message);
    this.status = 401;
  }
}

test("makeAuth0Verifier treats statusCode=401 errors as auth failures", async () => {
  const result = await runVerifierWithMiddleware((_req, _res, next) => {
    next(new StatusCode401Error("status_code_401"));
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.errorName, AuthVerificationError.name);
  assert.equal(result.body.errorMessage, "status_code_401");
});

test("makeAuth0Verifier treats status=401 errors as auth failures", async () => {
  const result = await runVerifierWithMiddleware((_req, _res, next) => {
    next(new Status401Error("status_401"));
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.errorName, AuthVerificationError.name);
  assert.equal(result.body.errorMessage, "status_401");
});

test("makeAuth0Verifier maps unexpected failures to InternalVerificationError", async () => {
  const result = await runVerifierWithMiddleware((_req, _res, next) => {
    next(new Error("boom"));
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.errorName, InternalVerificationError.name);
  assert.equal(result.body.errorMessage, "boom");
});

test("makeAuth0Verifier fails closed on non-error next values", async () => {
  const result = await runVerifierWithMiddleware((_req, _res, next) => {
    next("route");
  });

  assert.equal(result.status, 500);
  assert.equal(result.body.errorName, InternalVerificationError.name);
  assert.match(result.body.errorMessage ?? "", /middleware_failed:route/);
});
