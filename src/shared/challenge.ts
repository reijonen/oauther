import type { Config } from "./config-types.js";

export function buildChallenge(config: Config, errorCode = "", includeScope = false): string {
  const params: string[] = [];
  if (errorCode) {
    params.push(`error="${errorCode}"`);
  }
  params.push(`resource_metadata="${config.resourceMetadataUrl}"`);
  if (includeScope && config.requiredScopes.length > 0) {
    params.push(`scope="${config.requiredScope}"`);
  }
  return `Bearer ${params.join(", ")}`;
}
