import type { Express } from "express";
import { constants } from "node:http2";

import type { Config } from "../shared/config-types.js";

export function registerProtectedResourceRoute(app: Express, config: Config): void {
  app
    .route("/.well-known/oauth-protected-resource")
    .get((_req, res) => {
      res.type("application/json")
        .status(constants.HTTP_STATUS_OK)
        .send({
          resource: config.resourceBaseUrl,
          authorization_servers: [config.issuerUrl],
          scopes_supported: config.requiredScopes,
        });
    })
    .all((_req, res) => {
      res.sendStatus(constants.HTTP_STATUS_METHOD_NOT_ALLOWED);
    });
}
