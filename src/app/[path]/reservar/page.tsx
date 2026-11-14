import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAvailableSlots } from "@/core/available-slots";
import { capitalize, formatDay } from "@/core/format";
import { dayInTimeZone, TIME_ZONE_LABEL } from "@/core/time-zone";
import { findBusinessByPath } from "@/db/businesses";
import { env } from "@/lib/env";
import { dayHref, SLOT_PARAM } from "../format";
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
  const slot = day
    ? (await getAvailableSlots(business.id, day, new Date())).find(
        (available) => available.startsAt.getTime() === startsAt!.getTime(),
      )
    : undefined;

  return (
    <>
      <header className={styles.header}>
        <h1>{business.name}</h1>
        {slot && day && (
          <p className={styles.muted}>
            {capitalize(formatDay(day))}, {slot.time} ({TIME_ZONE_LABEL}).
          </p>
        )}
      </header>

      {slot && day ? (
        <ReservationForm
          path={path}
          startsAt={slot.startsAt.toISOString()}
          businessName={business.name}
          backHref={dayHref(path, day)}
          timeZoneLabel={TIME_ZONE_LABEL}
          // Read at runtime on the server, so the same build works with any key.
          turnstileSiteKey={env.TURNSTILE_SITE_KEY}
        />
      ) : (
        <section className={styles.card}>
          <p className={styles.notice}>Ese horario ya no está disponible.</p>
          <Link href={day ? dayHref(path, day) : `/${path}`}>Elegir otro horario</Link>
        </section>
      )}
    </>
  );
}
