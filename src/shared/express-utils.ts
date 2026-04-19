import type { Request, Response } from "express";

import type { ExpressMiddleware } from "./express-types.js";

export async function runMiddleware(
  middleware: ExpressMiddleware,
  req: Request,
  res: Response,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    middleware(req, res, (nextArg?: string | Error | number | boolean | object | null) => {
      if (!nextArg) {
        resolve();
      } else if (nextArg instanceof Error) {
        reject(nextArg);
      } else {
        reject(new Error(`middleware_failed:${String(nextArg)}`));
      }
    });
  });
}
