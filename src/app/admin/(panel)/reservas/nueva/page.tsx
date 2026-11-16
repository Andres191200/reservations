import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAvailableSlotsWithProfessionals } from "@/core/available-slots";
import { dayInTimeZone, TIME_ZONE_LABEL } from "@/core/time-zone";
import styles from "../../../admin.module.scss";
import { getSessionBusiness } from "../../../session";
import { chosenDay, DAY_PARAM, panelHref } from "../../day";
import { DayNavigation } from "../../day-navigation";
import { NewReservationForm, type SlotOption } from "./new-reservation-form";

export const metadata: Metadata = { title: "Nueva Reserva · Reservas" };

const ROUTE = "/admin/reservas/nueva";

/**
 * The Admin enters a Reservation the Customer asked for by another channel. Only the
 * Available slots of the chosen day are offered, with the same rules as the public page.
 */
export default function NewReservationPage({ searchParams }: PageProps<"/admin/reservas/nueva">) {
  return (
    <>
      <h1>Nueva Reserva</h1>
      <div className={styles.sections}>
        <section className={styles.section}>
          <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
            <NewReservation searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </>
  );
}

async function NewReservation({
  searchParams,
}: Pick<PageProps<"/admin/reservas/nueva">, "searchParams">) {
  const [business, query] = await Promise.all([getSessionBusiness(), searchParams]);
  const now = new Date();
  const today = dayInTimeZone(now);
  const day = chosenDay(query, today);
  const slots = await getAvailableSlotsWithProfessionals(business.id, day, now);

  const options: SlotOption[] = slots.map((slot) => ({
    startsAt: slot.startsAt.toISOString(),
    time: slot.time,
    freeProfessionals: slot.freeProfessionals,
  }));

  return (
    <>
      <DayNavigation route={ROUTE} day={day} today={today} />
      {options.length === 0 ? (
        <p className={styles.notice}>
          No hay Horarios disponibles este día. Se aplican las mismas reglas que en la página
          pública: Horario de atención, Antelación mínima y Antelación máxima.
        </p>
      ) : (
        // A new key per day starts the form over when the day changes.
        <NewReservationForm key={day} slots={options} timeZoneLabel={TIME_ZONE_LABEL} />
      )}
      <Link href={panelHref("/admin/reservas", { [DAY_PARAM]: day })}>
        ← Volver a Reservas del día
      </Link>
    </>
  );
}
