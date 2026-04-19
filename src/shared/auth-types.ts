import type { Request, Response } from "express";
import type { AuthOptions } from "express-oauth2-jwt-bearer";

import type { ExpressMiddleware } from "./express-types.js";

export type TokenPayload = {
  scope?: string;
};

export type VerifyToken = (req: Request, res: Response) => Promise<TokenPayload>;

export type AuthMiddlewareFactory = (opts: AuthOptions) => ExpressMiddleware;
