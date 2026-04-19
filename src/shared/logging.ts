import type { Request } from "express";
import type { AuthLogContext } from "./logging-types.js";

function getRequestId(req: Request): string {
  const requestIdHeader = req.header("x-request-id");
  if (requestIdHeader) {
    return requestIdHeader;
  } else {
    return "none";
  }
}

export function logAuthEvent(req: Request, context: AuthLogContext): void {
  const payload = {
    event: "auth_decision",
    path: req.path,
    method: req.method,
    request_id: getRequestId(req),
    outcome: context.outcome,
    reason: context.reason,
    status: context.status,
  };

  if (context.reason === "internal_verifier_failure" || context.reason === "internal_unexpected_failure") {
    console.error(JSON.stringify(payload));
  } else {
    console.info(JSON.stringify(payload));
  }
}
