import type { DenyCounter } from "./rate-limit-types.js";

export class DenyRateLimiter {
  private readonly windowMs: number;
  private readonly maxDenies: number;
  private readonly counters: Map<string, DenyCounter>;

  constructor(windowMs: number, maxDenies: number) {
    this.windowMs = windowMs;
    this.maxDenies = maxDenies;
    this.counters = new Map<string, DenyCounter>();
  }

  isLimited(key: string, nowMs = Date.now()): boolean {
    this.cleanup(nowMs);
    const entry = this.counters.get(key);
    if (!entry) {
      return false;
    } else {
      return entry.count >= this.maxDenies;
    }
  }

  registerDeny(key: string, nowMs = Date.now()): void {
    this.cleanup(nowMs);
    const existing = this.counters.get(key);
    if (!existing) {
      this.counters.set(key, {
        count: 1,
        windowStartMs: nowMs,
      });
    } else {
      this.counters.set(key, {
        count: existing.count + 1,
        windowStartMs: existing.windowStartMs,
      });
    }
  }

  private cleanup(nowMs: number): void {
    for (const [key, value] of this.counters.entries()) {
      if (nowMs - value.windowStartMs >= this.windowMs) {
        this.counters.delete(key);
      }
    }
  }
}
