/**
 * In-memory rate limit with a sliding window: each key (an IP) can take up to `limit` uses
 * in any `windowMs` span. It lives in the server's memory, so it is enough for a single
 * instance of the app; a restart starts it from zero.
 *
 * The clock (`now`) is received from outside, like in the core, so tests can simulate it.
 */
export function createRateLimiter(options: { limit: number; windowMs: number }) {
  const { limit, windowMs } = options;
  /** Times of the uses of each key still inside the window, oldest first. */
  const usesByKey = new Map<string, number[]>();
  let lastSweep = 0;

  function usesInWindow(key: string, now: number): number[] {
    const uses = (usesByKey.get(key) ?? []).filter((time) => time > now - windowMs);
    if (uses.length > 0) usesByKey.set(key, uses);
    else usesByKey.delete(key);
    return uses;
  }

  /** Forgets the keys without recent uses, at most once per window, so memory stays bounded. */
  function sweep(now: number) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const key of usesByKey.keys()) usesInWindow(key, now);
  }

  return {
    /**
     * Takes one use for `key`. It is synchronous, so two simultaneous requests cannot both
     * take the last one. If the action the use was for does not happen after all (a
     * rejected Reservation), `release` gives it back.
     */
    take(key: string, now: Date): RateLimitDecision {
      const time = now.getTime();
      sweep(time);
      const uses = usesInWindow(key, time);
      if (uses.length >= limit) {
        return { allowed: false, retryAt: new Date(uses[0] + windowMs) };
      }
      uses.push(time);
      usesByKey.set(key, uses);
      let released = false;
      return {
        allowed: true,
        release() {
          if (released) return;
          released = true;
          const current = usesByKey.get(key);
          const index = current?.indexOf(time) ?? -1;
          if (index !== -1) current!.splice(index, 1);
        },
      };
    },
  };
}

export type RateLimitDecision =
  | { allowed: true; release(): void }
  /** `retryAt`: when the oldest use leaves the window and a new one is possible. */
  | { allowed: false; retryAt: Date };
