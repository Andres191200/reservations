import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAvailableSlots, getReservableDays } from "@/core/available-slots";
import { getReservationRules } from "@/core/business-configuration";
import {
  addDays,
  instantInTimeZone,
  isCalendarDay,
  TIME_ZONE,
  TIME_ZONE_LABEL,
  type CalendarDay,
} from "@/core/time-zone";
import { findBusinessByPath } from "@/db/businesses";
import { DayPicker } from "./day-picker";
import styles from "./public-page.module.scss";

/** Query parameter with the chosen day: app.com/<path>?dia=2026-11-12. */
const DAY_PARAM = "dia";

export async function generateMetadata({ params }: PageProps<"/[path]">): Promise<Metadata> {
  const business = await findBusinessByPath((await params).path);
  return { title: business ? `${business.name} · Reservas` : "Negocio no encontrado · Reservas" };
}

/** Public page of a Business: the Customer chooses a day and sees its Available slots. */
export default function PublicPage({ params, searchParams }: PageProps<"/[path]">) {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
        <BusinessAvailability params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function BusinessAvailability({ params, searchParams }: PageProps<"/[path]">) {
  const [{ path }, query] = await Promise.all([params, searchParams]);
  const business = await findBusinessByPath(path);
  if (!business) notFound();

  const now = new Date();
  const rules = await getReservationRules(business.id);
  const reservableDays = getReservableDays(rules, now);

  const requested = query[DAY_PARAM];
  const day = typeof requested === "string" ? requested : reservableDays.first;
  const inRange =
    isCalendarDay(day) && day >= reservableDays.first && day <= reservableDays.last;

  return (
    <>
      <header className={styles.header}>
        <h1>{business.name}</h1>
        <p className={styles.muted}>Elegí un día para ver los Horarios disponibles.</p>
      </header>

      <section className={styles.card}>
        <DayPicker
          action={`/${path}`}
          name={DAY_PARAM}
          value={inRange ? day : reservableDays.first}
          min={reservableDays.first}
          max={reservableDays.last}
        />

        {inRange ? (
          <>
            <nav className={styles.dayNav} aria-label="Cambiar de día">
              {day > reservableDays.first ? (
                <Link href={dayHref(path, addDays(day, -1))}>← Día anterior</Link>
              ) : (
                <span />
              )}
              {day < reservableDays.last && (
                <Link href={dayHref(path, addDays(day, 1))}>Día siguiente →</Link>
              )}
            </nav>
            <Suspense key={day} fallback={<p className={styles.muted}>Cargando…</p>}>
              <AvailableSlots businessId={business.id} day={day} now={now} />
            </Suspense>
          </>
        ) : (
          <p className={styles.notice}>
            Ese día no está disponible. Podés elegir entre el {formatDay(reservableDays.first)} y
            el {formatDay(reservableDays.last)}.
          </p>
        )}
      </section>
    </>
  );
}

async function AvailableSlots({
  businessId,
  day,
  now,
}: {
  businessId: Parameters<typeof getAvailableSlots>[0];
  day: CalendarDay;
  now: Date;
}) {
  const slots = await getAvailableSlots(businessId, day, now);

  return (
    <div className={styles.slots}>
      <h2>{capitalize(formatDay(day))}</h2>
      {slots.length === 0 ? (
        <p className={styles.notice}>No hay Horarios disponibles para este día.</p>
      ) : (
        <>
          <ul className={styles.slotList}>
            {slots.map((slot) => (
              <li key={slot.startsAt.toISOString()}>
                <time dateTime={slot.startsAt.toISOString()}>{slot.time}</time>
              </li>
            ))}
          </ul>
          <p className={styles.muted}>Horarios en {TIME_ZONE_LABEL}.</p>
        </>
      )}
    </div>
  );
}

function dayHref(path: string, day: CalendarDay): string {
  return `/${path}?${DAY_PARAM}=${day}`;
}

const dayFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

/** "miércoles 11 de noviembre". */
function formatDay(day: CalendarDay): string {
  return dayFormat.format(instantInTimeZone(day, "12:00")).replace(",", "");
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
