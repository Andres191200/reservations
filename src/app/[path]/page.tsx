import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getReservableDaysOverview,
  type EmptyDayReason,
  type ReservableDaysOverview,
} from "@/core/available-slots";
import {
  capitalize,
  formatDay,
  formatHours,
  formatMinutes,
  openingHoursLines,
  weekdayPlural,
} from "@/core/format";
import {
  addDays,
  isCalendarDay,
  TIME_ZONE_LABEL,
  weekdayOf,
  type CalendarDay,
} from "@/core/time-zone";
import { findBusinessByPath } from "@/db/businesses";
import { DayPicker } from "./day-picker";
import { DAY_PARAM, dayHref, reserveHref } from "./format";
import styles from "./public-page.module.scss";

/** From this many Available slots on, the day navigation is repeated below the list. */
const SLOTS_FOR_BOTTOM_NAV = 12;

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

  const overview = await getReservableDaysOverview(business.id, new Date());
  const { first, last } = overview.reservableDays;

  // Without a valid day in the URL, the first one the Customer can actually reserve.
  const requested = query[DAY_PARAM];
  const day =
    typeof requested === "string" && isCalendarDay(requested)
      ? requested
      : (overview.firstDayWithSlots() ?? first);
  const inRange = day >= first && day <= last;

  return (
    <>
      <header className={styles.header}>
        <h1>{business.name}</h1>
        <BusinessFacts overview={overview} day={inRange ? day : first} />
      </header>

      <section className={styles.card} aria-label="Elegí un día y un Horario disponible">
        <DayPicker action={`/${path}`} name={DAY_PARAM} value={day} min={first} max={last} />

        {inRange ? (
          <DayAvailability
            overview={overview}
            businessName={business.name}
            path={path}
            day={day}
          />
        ) : (
          <div className={styles.notice}>
            <p className={styles.noticeTitle}>
              {day < first
                ? `El ${formatDay(day)} ya pasó.`
                : `Todavía no se puede reservar el ${formatDay(day)}.`}
            </p>
            <p>Se puede reservar desde hoy hasta el {formatDay(last)}.</p>
            <NextDayLink path={path} day={overview.firstDayWithSlots()} />
          </div>
        )}
      </section>
    </>
  );
}

/** What any Customer wants to know before reserving, whatever the Business does. */
function BusinessFacts({ overview, day }: { overview: ReservableDaysOverview; day: CalendarDay }) {
  const lines = openingHoursLines(overview.openingHours);
  const deadlineHours = overview.rules.cancellationDeadlineHours;

  return (
    <dl className={styles.facts}>
      {lines.length > 0 && (
        <div>
          <dt>Horario de atención</dt>
          <dd>
            <ul className={styles.openingHours}>
              {lines.map((line) => (
                <li key={line.days}>
                  <span>{line.days}</span> <span className={styles.hours}>{line.hours}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
      <div>
        <dt>Duración de Reserva</dt>
        <dd>{formatMinutes(overview.availabilityOn(day).durationMinutes)}</dd>
      </div>
      <div>
        <dt>Límite de cancelación</dt>
        <dd>
          {deadlineHours === 0
            ? "Hasta que empiece la Reserva"
            : `Hasta ${formatHours(deadlineHours)} antes`}
        </dd>
      </div>
    </dl>
  );
}

function DayAvailability({
  overview,
  businessName,
  path,
  day,
}: {
  overview: ReservableDaysOverview;
  businessName: string;
  path: string;
  day: CalendarDay;
}) {
  const { slots, emptyReason } = overview.availabilityOn(day);
  const { first, last } = overview.reservableDays;
  const dayNav = (label: string) => (
    <nav className={styles.dayNav} aria-label={label}>
      {day > first ? <Link href={dayHref(path, addDays(day, -1))}>← Día anterior</Link> : <span />}
      {day < last && <Link href={dayHref(path, addDays(day, 1))}>Día siguiente →</Link>}
    </nav>
  );

  return (
    <>
      {dayNav("Cambiar de día")}
      <div className={styles.slots}>
        <h2>{capitalize(formatDay(day))}</h2>
        {slots.length === 0 ? (
          <div className={styles.notice}>
            <p className={styles.noticeTitle}>
              {emptyDayMessage(emptyReason ?? "noneLeft", businessName, day, first)}
            </p>
            {/* The next day with Available slots, or, if none is after it, the first one. */}
            <NextDayLink
              path={path}
              day={overview.firstDayWithSlots(addDays(day, 1)) ?? overview.firstDayWithSlots()}
              noneText={`Por ahora no hay Horarios disponibles hasta el ${formatDay(last)}.`}
            />
          </div>
        ) : (
          <>
            <p className={styles.timeZone}>Horarios en {TIME_ZONE_LABEL}.</p>
            <ul className={styles.slotList}>
              {slots.map((slot) => (
                <li key={slot.startsAt.toISOString()}>
                  <Link
                    href={reserveHref(path, slot.startsAt)}
                    aria-label={`Reservar a las ${slot.time}`}
                  >
                    <time dateTime={slot.startsAt.toISOString()}>{slot.time}</time>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {slots.length >= SLOTS_FOR_BOTTOM_NAV && dayNav("Cambiar de día, debajo de los Horarios")}
    </>
  );
}

function emptyDayMessage(
  reason: EmptyDayReason,
  businessName: string,
  day: CalendarDay,
  today: CalendarDay,
): string {
  switch (reason) {
    case "weekdayClosed":
      return `${businessName} no atiende los ${weekdayPlural(weekdayOf(day))}.`;
    case "closure":
      return `${businessName} no atiende ese día.`;
    case "noneLeft":
      return `Ya no quedan Horarios disponibles para ${day === today ? "hoy" : "este día"}.`;
  }
}

/** "Ver el jueves 26 de noviembre", or `noneText` when no day has Available slots. */
function NextDayLink({
  path,
  day,
  noneText,
}: {
  path: string;
  day: CalendarDay | undefined;
  noneText?: string;
}) {
  if (!day) return noneText ? <p>{noneText}</p> : null;
  return (
    <Link className={styles.nextDay} href={dayHref(path, day)}>
      Ver el {formatDay(day)}
    </Link>
  );
}
