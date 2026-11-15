import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAgendas } from "@/core/agenda";
import { dayInTimeZone } from "@/core/time-zone";
import styles from "../../admin.module.scss";
import { getSessionBusiness } from "../../session";
import { chosenDay, DAY_PARAM, panelHref, PROFESSIONAL_PARAM, queryValue } from "../day";
import { DayNavigation } from "../day-navigation";
import { ReservationList } from "../reservation-list";

export const metadata: Metadata = { title: "Agenda · Reservas" };

const ROUTE = "/admin/agenda";

/** The Agenda of one Professional on a day, choosing among every Professional of that day. */
export default function AgendaPage({ searchParams }: PageProps<"/admin/agenda">) {
  return (
    <>
      <h1>Agenda</h1>
      <div className={styles.sections}>
        <section className={styles.section}>
          <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
            <ProfessionalAgenda searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </>
  );
}

async function ProfessionalAgenda({
  searchParams,
}: Pick<PageProps<"/admin/agenda">, "searchParams">) {
  const [business, query] = await Promise.all([getSessionBusiness(), searchParams]);
  const today = dayInTimeZone(new Date());
  const day = chosenDay(query, today);
  const agendas = await getAgendas(business.id, day);

  if (agendas.length === 0) {
    return (
      <p className={styles.muted}>
        Todavía no hay Profesionales.{" "}
        <Link href="/admin/profesionales">Agregá al menos uno</Link> para poder recibir Reservas.
      </p>
    );
  }

  // A Professional that has no Agenda that day (deactivated, without Reservations) or an
  // unknown id fall back to the first one.
  const requested = queryValue(query, PROFESSIONAL_PARAM);
  const selected = agendas.find((agenda) => agenda.professional.id === requested) ?? agendas[0];
  const { professional, reservations } = selected;

  return (
    <>
      <nav className={styles.tabs} aria-label="Profesionales">
        {agendas.map((agenda) => (
          <Link
            key={agenda.professional.id}
            href={panelHref(ROUTE, {
              [DAY_PARAM]: day,
              [PROFESSIONAL_PARAM]: agenda.professional.id,
            })}
            aria-current={agenda === selected ? "page" : undefined}
          >
            {agenda.professional.name}
            {!agenda.professional.active && " (dado de baja)"}
          </Link>
        ))}
      </nav>
      <DayNavigation
        route={ROUTE}
        day={day}
        today={today}
        keep={{ [PROFESSIONAL_PARAM]: professional.id }}
      />
      {reservations.length === 0 ? (
        <p className={styles.notice}>{professional.name} no tiene Reservas este día.</p>
      ) : (
        <ReservationList reservations={reservations} />
      )}
    </>
  );
}
