import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limiter";

// The clock is always simulated: each test moves it by hand.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const START = new Date("2026-11-11T12:00:00.000Z");

function at(minutesLater: number) {
  return new Date(START.getTime() + minutesLater * MINUTE);
}

function tenPerHour() {
  return createRateLimiter({ limit: 10, windowMs: HOUR });
}

describe("Rate limit of 10 per hour", () => {
  it("allows the first 10 uses of an IP and rejects the 11th", () => {
    const limiter = tenPerHour();

    for (let use = 1; use <= 10; use++) {
      expect(limiter.take("203.0.113.7", at(use)).allowed).toBe(true);
    }
    expect(limiter.take("203.0.113.7", at(11))).toEqual({
      allowed: false,
      // The first use (minute 1) leaves the window an hour later.
      retryAt: at(61),
    });
  });

  it("counts each IP on its own", () => {
    const limiter = tenPerHour();
    for (let use = 1; use <= 10; use++) limiter.take("203.0.113.7", at(use));

    expect(limiter.take("198.51.100.4", at(11)).allowed).toBe(true);
  });

  it("allows again once the oldest use is an hour old (sliding window)", () => {
    const limiter = tenPerHour();
    for (let use = 0; use < 10; use++) limiter.take("203.0.113.7", at(use));

    expect(limiter.take("203.0.113.7", at(59)).allowed).toBe(false);
    expect(limiter.take("203.0.113.7", at(60.01)).allowed).toBe(true);
    // Only the use of minute 0 left; the one of minute 1 is still inside.
    expect(limiter.take("203.0.113.7", at(60.02)).allowed).toBe(false);
  });

  it("a released use does not count", () => {
    const limiter = tenPerHour();
    for (let use = 1; use <= 9; use++) limiter.take("203.0.113.7", at(use));

    const tenth = limiter.take("203.0.113.7", at(10));
    if (!tenth.allowed) throw new Error("the 10th use should be allowed");
    tenth.release();
    tenth.release(); // Releasing twice gives back only one.

    expect(limiter.take("203.0.113.7", at(11)).allowed).toBe(true);
    expect(limiter.take("203.0.113.7", at(12)).allowed).toBe(false);
  });

  it("rejections do not extend the wait", () => {
    const limiter = tenPerHour();
    for (let use = 0; use < 10; use++) limiter.take("203.0.113.7", at(use));
    for (let attempt = 10; attempt < 50; attempt++) limiter.take("203.0.113.7", at(attempt));

    expect(limiter.take("203.0.113.7", at(60.01)).allowed).toBe(true);
  });
});
