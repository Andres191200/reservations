import type { Metadata } from "next";
import { Suspense } from "react";
import { getOpeningHours, getReservationRules } from "@/core/business-configuration";
import { TIME_ZONE_LABEL } from "@/core/time-zone";
import { WEEKDAYS } from "@/core/weekdays";
import styles from "../../admin.module.scss";
import { getSessionBusiness } from "../../session";
import type { DayFields } from "./actions";
import { OpeningHoursForm } from "./opening-hours-form";
import { ReservationRulesForm } from "./reservation-rules-form";

export const metadata: Metadata = { title: "Configuración · Reservas" };

/** Suggested range for a day that is closed today, in case the Admin opens it. */
const SUGGESTED_RANGE = { opensAt: "09:00", closesAt: "18:00" };

export default function ConfigurationPage() {
  return (
    <>
      <h1>Configuración</h1>
      <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
        <Configuration />
      </Suspense>
    </>
  );
}

async function Configuration() {
  const business = await getSessionBusiness();
  const [openDays, rules] = await Promise.all([
    getOpeningHours(business.id),
    getReservationRules(business.id),
  ]);

  const days: DayFields[] = WEEKDAYS.map(({ weekday }) => {
    const open = openDays.find((day) => day.weekday === weekday);
    return open ? { ...open, closed: false } : { weekday, closed: true, ...SUGGESTED_RANGE };
  });

  return (
    <div className={styles.sections}>
      <section className={styles.section}>
        <h2>Horario de atención</h2>
        <p className={styles.muted}>
          Una franja por día, común a todos los Profesionales. Horas en {TIME_ZONE_LABEL}.
        </p>
        <OpeningHoursForm initialDays={days} />
      </section>
      <section className={styles.section}>
        <h2>Reglas de Reserva</h2>
        <ReservationRulesForm
          initialFields={{
            reservationDurationMinutes: String(rules.reservationDurationMinutes),
            minimumNoticeHours: String(rules.minimumNoticeHours),
            maximumNoticeDays: String(rules.maximumNoticeDays),
            cancellationDeadlineHours: String(rules.cancellationDeadlineHours),
          }}
        />
      </section>
    </div>
  );
}
