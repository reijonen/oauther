export class AuthVerificationError extends Error {
  constructor(message = "authentication failed") {
    super(message);
    this.name = "AuthVerificationError";
  }
}

export class InternalVerificationError extends Error {
  constructor(message = "internal verifier failure") {
    super(message);
    this.name = "InternalVerificationError";
  }
}
