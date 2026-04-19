import type { Express } from "express";
import { constants } from "node:http2";

import { AuthVerificationError, InternalVerificationError } from "../shared/errors.js";
import { extractBearerToken, hasRequiredScopes } from "../shared/auth-utils.js";
import { buildChallenge } from "../shared/challenge.js";
import { logAuthEvent } from "../shared/logging.js";
import { DenyRateLimiter } from "../shared/rate-limiter.js";
import type { VerifyToken } from "../shared/auth-types.js";
import type { Config } from "../shared/config-types.js";

function firstHeaderValue(value = ""): string {
  const first = value.split(",", 1)[0];
  if (first) {
    return first.trim();
  } else {
    return "";
  }
}

function clientKeyFromRequest(realIpHeader: string | undefined, ip: string | undefined): string {
  const realIp = firstHeaderValue(realIpHeader ?? "");
  if (realIp) {
    return `rip:${realIp}`;
  } else if (ip) {
    return `ip:${ip}`;
  } else {
    return "ip:unknown";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    setTimeout(() => {
      reject(new InternalVerificationError("auth_decision_timeout"));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

export function registerAuthRoute(app: Express, config: Config, verifyToken: VerifyToken): void {
  const denyRateLimiter = new DenyRateLimiter(config.authDenyRateWindowMs, config.authDenyRateMax);

  app
    .route("/auth")
    .get(async (req, res) => {
      const clientKey = clientKeyFromRequest(req.header("x-real-ip"), req.ip);
      if (denyRateLimiter.isLimited(clientKey)) {
        res.setHeader("WWW-Authenticate", buildChallenge(config, "", true));
        res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
        logAuthEvent(req, {
          outcome: "deny",
          reason: "rate_limited",
          status: constants.HTTP_STATUS_UNAUTHORIZED,
        });
        denyRateLimiter.registerDeny(clientKey);
        return;
      }

      const authorizationHeader = req.header("authorization") ?? "";
      if (Buffer.byteLength(authorizationHeader, "utf8") > config.authHeaderMaxBytes) {
        res.setHeader("WWW-Authenticate", buildChallenge(config, "", true));
        res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
        logAuthEvent(req, {
          outcome: "deny",
          reason: "auth_header_too_large",
          status: constants.HTTP_STATUS_UNAUTHORIZED,
        });
        denyRateLimiter.registerDeny(clientKey);
        return;
      }

      req.setTimeout(config.authDecisionTimeoutMs);
      const token = extractBearerToken(req.header("authorization"));
      if (!token) {
        res.setHeader("WWW-Authenticate", buildChallenge(config, "", true));
        res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
        logAuthEvent(req, {
          outcome: "deny",
          reason: "missing_or_malformed_bearer",
          status: constants.HTTP_STATUS_UNAUTHORIZED,
        });
        denyRateLimiter.registerDeny(clientKey);
      } else {
        await withTimeout(verifyToken(req, res), config.authDecisionTimeoutMs)
          .then((payload) => {
            if (!hasRequiredScopes(payload.scope, config.requiredScopes)) {
              res.setHeader("WWW-Authenticate", buildChallenge(config, "insufficient_scope", true));
              res.sendStatus(constants.HTTP_STATUS_FORBIDDEN);
              logAuthEvent(req, {
                outcome: "deny",
                reason: "insufficient_scope",
                status: constants.HTTP_STATUS_FORBIDDEN,
              });
            } else {
              res.sendStatus(constants.HTTP_STATUS_NO_CONTENT);
              logAuthEvent(req, {
                outcome: "allow",
                reason: "token_verified",
                status: constants.HTTP_STATUS_NO_CONTENT,
              });
            }
          })
          .catch((error: Error) => {
            res.setHeader("WWW-Authenticate", buildChallenge(config, "", true));
            res.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
            denyRateLimiter.registerDeny(clientKey);

            if (error instanceof AuthVerificationError) {
              logAuthEvent(req, {
                outcome: "deny",
                reason: "auth_verification_failed",
                status: constants.HTTP_STATUS_UNAUTHORIZED,
              });
            } else if (error instanceof InternalVerificationError) {
              logAuthEvent(req, {
                outcome: "deny",
                reason: "internal_verifier_failure",
                status: constants.HTTP_STATUS_UNAUTHORIZED,
              });
            } else {
              logAuthEvent(req, {
                outcome: "deny",
                reason: "internal_unexpected_failure",
                status: constants.HTTP_STATUS_UNAUTHORIZED,
              });
            }
          });
      }
    })
    .all((_req, res) => {
      res.sendStatus(constants.HTTP_STATUS_METHOD_NOT_ALLOWED);
    });
}
