import {
  auth,
  InvalidRequestError,
  InvalidTokenError,
  UnauthorizedError,
} from "express-oauth2-jwt-bearer";
import type { Request, Response } from "express";

import type { AuthMiddlewareFactory, TokenPayload, VerifyToken } from "./auth-types.js";
import type { Config } from "./config-types.js";
import { AuthVerificationError, InternalVerificationError } from "./errors.js";
import { runMiddleware } from "./express-utils.js";

function isAuthFailureError(error: Error): boolean {
  if (
    error instanceof UnauthorizedError ||
    error instanceof InvalidRequestError ||
    error instanceof InvalidTokenError
  ) {
    return true;
  } else if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode === 401;
  } else if ("status" in error && typeof error.status === "number") {
    return error.status === 401;
  } else {
    return false;
  }
}

export function makeAuth0Verifier(
  config: Config,
  createAuthMiddleware: AuthMiddlewareFactory = auth,
): VerifyToken {
  const checkJwt = createAuthMiddleware({
    issuerBaseURL: `https://${config.auth0Domain}`,
    audience: config.auth0Audience,
    tokenSigningAlg: "RS256",
    clockTolerance: config.jwtClockSkewSeconds,
    timeoutDuration: config.jwtHttpTimeoutMs,
    cacheMaxAge: config.jwtJwksCacheMaxAgeMs,
    cooldownDuration: config.jwtJwksCooldownMs,
  });

  return async (req: Request, res: Response): Promise<TokenPayload> => {
    await runMiddleware(checkJwt, req, res).catch((error: Error) => {
      if (isAuthFailureError(error)) {
        throw new AuthVerificationError(error.message);
      } else {
        throw new InternalVerificationError(error.message);
      }
    });

    const scopeClaim = req.auth?.payload?.scope;
    if (scopeClaim) {
      return { scope: scopeClaim };
    } else {
      return {};
    }
  };
}
