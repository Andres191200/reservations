/** Outcome of an operation. `error` is shown to users, so it is in Spanish. */
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: string; fieldErrors?: FieldErrors };

/**
 * The messages of a rejected input that are about one of its fields, by that field's name
 * in the input, so a form can show each one beside its field. `error` still has them all.
 */
export type FieldErrors = Partial<Record<string, string>>;
