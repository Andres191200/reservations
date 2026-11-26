import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getReservableDaysOverview } from "@/core/available-slots";
import { capitalize, formatDay, formatHours } from "@/core/format";
import { dayInTimeZone, TIME_ZONE_LABEL } from "@/core/time-zone";
import { findBusinessByPath } from "@/db/businesses";
import { env } from "@/lib/env";
import { dayHref, SLOT_PARAM } from "../format";
import { unavailableSlotNotice } from "../messages";
import styles from "../public-page.module.scss";
import { ReservationForm } from "./reservation-form";

export async function generateMetadata({
  params,
}: PageProps<"/[path]/reservar">): Promise<Metadata> {
  const business = await findBusinessByPath((await params).path);
  return { title: business ? `Reservar en ${business.name}` : "Negocio no encontrado · Reservas" };
}

/** The Customer completes their data to reserve the Available slot they chose. */
export default function ReservePage({ params, searchParams }: PageProps<"/[path]/reservar">) {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
        <Reserve params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Reserve({ params, searchParams }: PageProps<"/[path]/reservar">) {
  const [{ path }, query] = await Promise.all([params, searchParams]);
  const business = await findBusinessByPath(path);
  if (!business) notFound();

  const requested = query[SLOT_PARAM];
  const startsAt = typeof requested === "string" ? new Date(requested) : undefined;
  const day = startsAt && !isNaN(startsAt.getTime()) ? dayInTimeZone(startsAt) : undefined;

  // Shows the form only for a block that is still an Available slot. The core checks it
  // again when reserving, since it can fill up while the Customer types.
  const overview = await getReservableDaysOverview(business.id, new Date());
  const { first, last } = overview.reservableDays;
  const inRange = day !== undefined && day >= first && day <= last;
  const slot = inRange
    ? overview
        .availabilityOn(day)
        .slots.find((available) => available.startsAt.getTime() === startsAt!.getTime())
    : undefined;
  // Otherwise, the way out: the day of the block if it still has Available slots, or else
  // the next one that has.
  const nextDay = (inRange && overview.firstDayWithSlots(day)) || overview.firstDayWithSlots();

  return (
    <>
      <header className={styles.header}>
        <h1>{business.name}</h1>
      </header>

      {slot && day ? (
        <>
          {/* What the Customer is about to reserve, and the way back to choose again. */}
          <div className={styles.chosenSlot}>
            <p>
              <span className={styles.chosenWhen}>
                {capitalize(formatDay(day))} ·{" "}
                <time className={styles.hours} dateTime={slot.startsAt.toISOString()}>
                  {slot.time}
                </time>
              </span>{" "}
              <span className={styles.chosenZone}>({TIME_ZONE_LABEL})</span>
            </p>
            <Link
              href={dayHref(path, day)}
              className={styles.changeLink}
              aria-label="Cambiar el día o el horario"
            >
              Cambiar
            </Link>
          </div>

          <ReservationForm
            path={path}
            startsAt={slot.startsAt.toISOString()}
            backHref={dayHref(path, day)}
            cancellationNote={cancellationNote(overview.rules.cancellationDeadlineHours)}
            // Read at runtime on the server, so the same build works with any key.
            turnstileSiteKey={env.TURNSTILE_SITE_KEY}
          />
        </>
      ) : (
        <UnavailableSlot
          href={nextDay ? dayHref(path, nextDay) : `/${path}`}
          notice={unavailableSlotNotice(business.name, day, overview)}
        />
      )}
    </>
  );
}

/** A block the Customer cannot reserve: why, and the way to the Available slots. */
function UnavailableSlot(props: {
  href: string;
  notice: { title: string; detail?: string };
}) {
  return (
    <section className={styles.notice}>
      <p className={styles.noticeTitle}>{props.notice.title}</p>
      {props.notice.detail && <p>{props.notice.detail}</p>}
      <Link className={styles.nextDay} href={props.href}>
        Ver los horarios disponibles
      </Link>
    </section>
  );
}

/** The Cancellation deadline, said before reserving: "Podés cancelarla hasta 2 horas antes." */
function cancellationNote(deadlineHours: number): string {
  return deadlineHours === 0
    ? "Podés cancelarla hasta que empiece."
    : `Podés cancelarla hasta ${formatHours(deadlineHours)} antes.`;
}
