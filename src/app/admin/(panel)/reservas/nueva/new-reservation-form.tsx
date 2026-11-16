"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import styles from "../../../admin.module.scss";
import { FormFeedback } from "../../../form-feedback";
import { DAY_PARAM, panelHref } from "../../day";
import { enterReservation, type EnterReservationState } from "./actions";

/** An Available slot as the form receives it from the page (dates as ISO strings). */
export type SlotOption = {
  startsAt: string;
  time: string;
  freeProfessionals: { id: string; name: string }[];
};

/**
 * The Admin enters a Reservation: the Available slot, the Customer's data and, if they
 * want, the Professional. Only the Professionals free in the chosen slot can be chosen;
 * leaving it empty applies the Auto-assignment.
 */
export function NewReservationForm({
  slots,
  timeZoneLabel,
}: {
  slots: SlotOption[];
  timeZoneLabel: string;
}) {
  const [state, action, pending] = useActionState<EnterReservationState, FormData>(
    enterReservation,
    {},
  );

  return (
    <>
      {state.entered && <EnteredMessage entered={state.entered} />}
      {/* A new key after each Reservation entered starts the form over, choices included. */}
      <ReservationFields
        key={state.lastEnteredId ?? "new"}
        slots={slots}
        timeZoneLabel={timeZoneLabel}
        state={state}
        action={action}
        pending={pending}
      />
    </>
  );
}

function ReservationFields({
  slots,
  timeZoneLabel,
  state,
  action,
  pending,
}: {
  slots: SlotOption[];
  timeZoneLabel: string;
  state: EnterReservationState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState("");

  // The slot may have stopped being available after a refresh: then nothing is chosen.
  const slot = slots.find((candidate) => candidate.startsAt === startsAt);
  const free = slot?.freeProfessionals ?? [];
  const chosenProfessional = free.some((professional) => professional.id === professionalId)
    ? professionalId
    : "";

  return (
    <form
      className={styles.form}
      // Sent by hand instead of with `action`, so React does not reset the form after a
      // rejection: the chosen slot and Professional (controlled) would be lost on screen.
      // After a Reservation entered, the new `key` starts the form over instead.
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      <fieldset className={styles.slotChoices}>
        <legend>
          Horario <span className={styles.muted}>({timeZoneLabel})</span>
        </legend>
        <div className={styles.slotGrid}>
          {slots.map((option) => (
            <label key={option.startsAt} className={styles.slotChoice}>
              <input
                type="radio"
                name="startsAt"
                value={option.startsAt}
                checked={option.startsAt === slot?.startsAt}
                onChange={() => setStartsAt(option.startsAt)}
                required
              />
              <span>{option.time}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.field}>
        <span>
          Profesional <span className={styles.muted}>(opcional)</span>
        </span>
        <select
          name="professionalId"
          value={chosenProfessional}
          onChange={(event) => setProfessionalId(event.target.value)}
          disabled={!slot}
        >
          <option value="">Asignación automática</option>
          {free.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.name}
            </option>
          ))}
        </select>
        <span className={styles.hint}>
          {slot
            ? "Solo aparecen los Profesionales libres en ese horario."
            : "Elegí un horario para ver quiénes están libres."}
        </span>
      </label>

      <label className={styles.field}>
        <span>Nombre del Cliente</span>
        <input
          name="name"
          required
          maxLength={100}
          autoComplete="off"
        />
      </label>
      <label className={styles.field}>
        <span>
          Email <span className={styles.muted}>(opcional)</span>
        </span>
        <input
          name="email"
          type="email"
          maxLength={254}
          autoComplete="off"
        />
        <span className={styles.hint}>
          Si lo cargás, el Cliente recibe el email de confirmación con el link para cancelar.
        </span>
      </label>
      <label className={styles.field}>
        <span>
          Teléfono <span className={styles.muted}>(opcional)</span>
        </span>
        <input
          name="phone"
          type="tel"
          maxLength={30}
          autoComplete="off"
        />
      </label>

      <FormFeedback error={state.error} />
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? "Cargando…" : "Cargar Reserva"}
      </button>
    </form>
  );
}

function EnteredMessage({
  entered,
}: {
  entered: NonNullable<EnterReservationState["entered"]>;
}) {
  return (
    <div role="status" className={styles.enteredMessage}>
      <p className={styles.success}>
        Reserva confirmada: {entered.customerName}, a las {entered.time}
        {entered.professionalName && ` con ${entered.professionalName}`}.
      </p>
      <p className={styles.muted}>
        {entered.emailSent
          ? "Le enviamos el email de confirmación con el link para cancelar."
          : "No se envió ningún email porque no cargaste uno."}{" "}
        <Link href={panelHref("/admin/reservas", { [DAY_PARAM]: entered.day })}>
          Ver Reservas del día
        </Link>
      </p>
    </div>
  );
}
