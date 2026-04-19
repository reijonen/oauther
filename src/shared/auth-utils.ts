export function extractBearerToken(authorizationHeader?: string): string | null {
  const value = (authorizationHeader ?? "").trim();
  if (!value) {
    return null;
  } else if (!value.startsWith("Bearer ")) {
    return null;
  } else {
    const token = value.slice("Bearer ".length).trim();
    if (!token) {
      return null;
    } else {
      return token;
    }
  }
}

export function hasRequiredScopes(tokenScopeRaw = "", requiredScopes: string[]): boolean {
  if (requiredScopes.length === 0) {
    return true;
  } else {
    const granted = new Set(tokenScopeRaw.split(/\s+/).filter(Boolean));
    return requiredScopes.every((scope) => granted.has(scope));
  }
}
