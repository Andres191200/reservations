/** Outcome of an operation. `error` is shown to users, so it is in Spanish. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
