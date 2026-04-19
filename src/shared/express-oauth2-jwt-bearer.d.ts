import "express-oauth2-jwt-bearer";

declare module "express-oauth2-jwt-bearer" {
  interface JWTPayload {
    scope?: string;
  }
}
