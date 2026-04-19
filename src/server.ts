import express from "express";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { registerAuthRoute } from "./routes/auth.js";
import { registerHealthzRoute } from "./routes/healthz.js";
import { registerProtectedResourceRoute } from "./routes/protected-resource.js";
import { makeAuth0Verifier } from "./shared/auth0-verifier.js";
import { loadConfig } from "./shared/config.js";
import type { VerifyToken } from "./shared/auth-types.js";
import type { Config } from "./shared/config-types.js";

export { loadConfig } from "./shared/config.js";

export function createApp(config: Config, verifyToken: VerifyToken): express.Express {
  const app = express();
  app.disable("x-powered-by");

  registerHealthzRoute(app);
  registerAuthRoute(app, config, verifyToken);
  registerProtectedResourceRoute(app, config);

  return app;
}

export function isMainModule(moduleUrl: string, argv1: string | undefined): boolean {
  if (!argv1) {
    return false;
  } else {
    const modulePath = resolve(fileURLToPath(moduleUrl));
    const invokedPath = resolve(argv1);
    if (modulePath === invokedPath) {
      return true;
    } else {
      return false;
    }
  }
}

if (isMainModule(import.meta.url, process.argv[1])) {
  const config = loadConfig();
  const app = createApp(config, makeAuth0Verifier(config));
  const server = app.listen(config.listenPort, () => {
    process.stdout.write(`oauther listening on :${config.listenPort}\n`);
  });
  server.headersTimeout = config.httpHeadersTimeoutMs;
  server.requestTimeout = config.httpRequestTimeoutMs;
  server.keepAliveTimeout = config.httpKeepAliveTimeoutMs;
}
