import type { Express } from "express";
import { constants } from "node:http2";

export function registerHealthzRoute(app: Express): void {
  app
    .route("/healthz")
    .get((_req, res) => {
      res.sendStatus(constants.HTTP_STATUS_OK);
    })
    .all((_req, res) => {
      res.sendStatus(constants.HTTP_STATUS_METHOD_NOT_ALLOWED);
    });
}
