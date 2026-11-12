"use client";

import Link from "next/link";
import { useActionState } from "react";
import styles from "../public-page.module.scss";
import { reserveSlot, type ReserveState } from "./actions";

/**
 * The Customer's contact data for the chosen block. Once the Reservation is Confirmed,
 * the form gives way to the confirmation screen.
 */
export function ReservationForm(props: {
  path: string;
  startsAt: string;
  businessName: string;
  /** The public page on the day of the block, to choose another one. */
  backHref: string;
  timeZoneLabel: string;
}) {
  const [state, action, pending] = useActionState<ReserveState, FormData>(
    reserveSlot.bind(null, props.path, props.startsAt),
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

      <button type="submit" className={styles.primaryButton} disabled={pending || state.slotTaken}>
        {pending ? "Reservando…" : "Confirmar Reserva"}
      </button>
    </form>
  );
}
