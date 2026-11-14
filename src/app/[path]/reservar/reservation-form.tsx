"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { TURNSTILE_FAILED_ERROR, TURNSTILE_TOKEN_FIELD } from "@/lib/turnstile-form";
import styles from "../public-page.module.scss";
import { reserveSlot, type ReserveState } from "./actions";
import { Turnstile, type TurnstileHandle } from "./turnstile";

/**
 * The Customer's contact data for the chosen block. Once the Reservation is Confirmed,
 * the form gives way to the confirmation screen. Turnstile's invisible captcha checks the
 * browser in the background; the form can be sent once it has a token.
 */
export function ReservationForm(props: {
  path: string;
  startsAt: string;
  businessName: string;
  /** The public page on the day of the block, to choose another one. */
  backHref: string;
  timeZoneLabel: string;
  turnstileSiteKey: string;
}) {
  const turnstile = useRef<TurnstileHandle>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileFailed, setTurnstileFailed] = useState(false);

  const [state, action, pending] = useActionState<ReserveState, FormData>(
    async (previous, formData) => {
      // The token just sent is used up: ask for the next one while the server answers.
      turnstile.current?.reset();
      return reserveSlot(props.path, props.startsAt, previous, formData);
    },
    {},
  );

  if (state.confirmed) {
    return (
      <section className={styles.card} aria-live="polite">
        <h2>¡Reserva confirmada!</h2>
        <p>
          Te esperamos en <strong>{props.businessName}</strong> el{" "}
          <strong>{state.confirmed.day.toLowerCase()}</strong> a las{" "}
          <strong>{state.confirmed.time}</strong> ({props.timeZoneLabel}).
        </p>
        <Link href={props.backHref}>Volver a los Horarios disponibles</Link>
      </section>
    );
  }

  return (
    <form action={action} className={styles.card}>
      <label className={styles.field}>
        <span>Nombre</span>
        <input
          name="name"
          required
          maxLength={100}
          autoComplete="name"
          defaultValue={state.fields?.name}
        />
      </label>
      <label className={styles.field}>
        <span>Email</span>
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          defaultValue={state.fields?.email}
        />
      </label>
      <label className={styles.field}>
        <span>
          Teléfono <span className={styles.muted}>(opcional)</span>
        </span>
        <input
          name="phone"
          type="tel"
          maxLength={30}
          autoComplete="tel"
          defaultValue={state.fields?.phone}
        />
      </label>

      <input type="hidden" name={TURNSTILE_TOKEN_FIELD} value={turnstileToken ?? ""} />
      <Turnstile
        ref={turnstile}
        siteKey={props.turnstileSiteKey}
        onToken={(token) => {
          setTurnstileToken(token);
          if (token) setTurnstileFailed(false);
        }}
        onError={() => setTurnstileFailed(true)}
      />
      {turnstileFailed && !turnstileToken && (
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

      <button
        type="submit"
        className={styles.primaryButton}
        disabled={pending || state.slotTaken || !turnstileToken}
      >
        {pending ? "Reservando…" : turnstileToken ? "Confirmar Reserva" : "Verificando…"}
      </button>
    </form>
  );
}
