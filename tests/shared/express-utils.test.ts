import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";

import type { ExpressMiddleware } from "../../src/shared/express-types.js";
import { runMiddleware } from "../../src/shared/express-utils.js";

function withRequest(
  middleware: ExpressMiddleware,
  routePath: string,
): Promise<{ status: number; body: string }> {
  const app = express();
  app.get(routePath, async (req, res) => {
    await runMiddleware(middleware, req, res)
      .then(() => {
        res.status(204).send("");
      })
      .catch((error: Error) => {
        res.status(500).send(error.message);
      });
  });

  return request(app)
    .get(routePath)
    .then((result) => ({ status: result.status, body: result.text }));
}

test("runMiddleware resolves when middleware calls next with no arg", async () => {
  const middleware: ExpressMiddleware = (_req, _res, next) => {
    next();
  };

  const result = await withRequest(middleware, "/ok");
  assert.equal(result.status, 204);
});

test("runMiddleware rejects when middleware calls next with Error", async () => {
  const middleware: ExpressMiddleware = (_req, _res, next) => {
    next(new Error("boom"));
  };

  const result = await withRequest(middleware, "/error");
  assert.equal(result.status, 500);
  assert.equal(result.body, "boom");
});

test("runMiddleware fails closed when middleware calls next with route string", async () => {
  const middleware: ExpressMiddleware = (_req, _res, next) => {
    next("route");
  };

  const result = await withRequest(middleware, "/route");
  assert.equal(result.status, 500);
  assert.match(result.body, /middleware_failed:route/);
});
