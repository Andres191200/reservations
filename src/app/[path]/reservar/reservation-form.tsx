"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { TURNSTILE_FAILED_ERROR, TURNSTILE_TOKEN_FIELD } from "@/lib/turnstile-form";
import styles from "../public-page.module.scss";
import { reserveSlot, type CustomerFields, type ReserveState } from "./actions";
import { Turnstile, type TurnstileHandle } from "./turnstile";

/** The fields in the order they appear, to focus the first one with an error. */
const FIELD_ORDER: (keyof CustomerFields)[] = ["name", "email", "phone"];

/**
 * The Customer's contact data for the chosen block. Once the Reservation is Confirmed,
 * the action takes the Customer to its page.
 *
 * Turnstile's invisible captcha checks the browser in the background. The button can be
 * touched before it answers: the form says it is checking the browser and sends itself as
 * soon as the token arrives. If it never arrives, it says so.
 */
export function ReservationForm(props: {
  path: string;
  startsAt: string;
  /** The public page on the day of the block, to choose another one. */
  backHref: string;
  /** "Podés cancelarla hasta 2 horas antes.", shown above the button. */
  cancellationNote: string;
  turnstileSiteKey: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  // A ref, not state: the token is read when sending, and it may arrive right then.
  const turnstileToken = useRef<string | null>(null);
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  // The Customer touched the button before the token: it is sent when the token arrives.
  const waitingForToken = useRef(false);
  const [waiting, setWaiting] = useState(false);

  const [state, action, pending] = useActionState<ReserveState, FormData>(
    async (previous, formData) => {
      formData.set(TURNSTILE_TOKEN_FIELD, turnstileToken.current ?? "");
      // The token just sent is used up: ask for the next one while the server answers.
      turnstile.current?.reset();
      return reserveSlot(props.path, props.startsAt, previous, formData);
    },
    {},
  );

  function wait(value: boolean) {
    waitingForToken.current = value;
    setWaiting(value);
  }

  // After a rejection, the first field to fix gets the focus, so its message is read.
  useEffect(() => {
    const first = FIELD_ORDER.find((name) => state.fieldErrors?.[name]);
    if (!first) return;
    const input = form.current?.elements.namedItem(first);
    if (input instanceof HTMLInputElement) input.focus();
  }, [state]);

  const errorOf = (name: keyof CustomerFields) => state.fieldErrors?.[name];

  return (
    <>
      <form
        ref={form}
        action={action}
        onSubmit={(event) => {
          if (turnstileToken.current) return;
          event.preventDefault();
          if (turnstileFailed) {
            setTurnstileFailed(false);
            turnstile.current?.reset();
          }
          wait(true);
        }}
        className={styles.card}
      >
        <Field
          label="Nombre"
          name="name"
          required
          maxLength={100}
          autoComplete="name"
          defaultValue={state.fields?.name}
          error={errorOf("name")}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          defaultValue={state.fields?.email}
          error={errorOf("email")}
          hint="Te mandamos la confirmación y el link para cancelar."
        />
        <Field
          label={
            <>
              Teléfono <span className={styles.muted}>(opcional)</span>
            </>
          }
          name="phone"
          type="tel"
          maxLength={30}
          autoComplete="tel"
          defaultValue={state.fields?.phone}
          error={errorOf("phone")}
        />

        {turnstileFailed && (
          <p role="alert" className={styles.error}>
            {TURNSTILE_FAILED_ERROR}
          </p>
        )}

        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
            {state.slotTaken && (
              <>
                {" "}
                <Link href={props.backHref}>Ver otros Horarios disponibles</Link>
              </>
            )}
          </p>
        )}

        <div className={styles.submit}>
          <p className={styles.note}>{props.cancellationNote}</p>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={pending || state.slotTaken}
          >
            Confirmar Reserva
          </button>
          {/* Always rendered, so screen readers announce it when it changes. */}
          <p role="status" className={styles.note}>
            {pending ? "Reservando…" : waiting ? "Verificando tu navegador…" : ""}
          </p>
        </div>
      </form>

      {/* Outside the card: invisible, it would leave an empty gap among the fields. The
        token goes to the form by a ref, not by a field. */}
      <Turnstile
        ref={turnstile}
        siteKey={props.turnstileSiteKey}
        onToken={(token) => {
          turnstileToken.current = token;
          if (!token) return;
          setTurnstileFailed(false);
          if (waitingForToken.current) {
            wait(false);
            form.current?.requestSubmit();
          }
        }}
        onError={() => {
          if (turnstileToken.current) return;
          setTurnstileFailed(true);
          wait(false);
        }}
      />
    </>
  );
}

/**
 * A labeled field. Its help and its error, when there are, are below it and read with it
 * (`aria-describedby`); with an error it is marked invalid.
 */
function Field({
  label,
  hint,
  error,
  ...input
}: {
  label: ReactNode;
  name: keyof CustomerFields;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const hintId = hint ? `${id}-ayuda` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        {...input}
      />
      {error && (
        <p id={errorId} className={styles.fieldError}>
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
