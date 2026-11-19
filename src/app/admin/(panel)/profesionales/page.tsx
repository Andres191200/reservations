import type { Metadata } from "next";
import { Suspense } from "react";
import { absenceDaysText, getUpcomingAbsences } from "@/core/absences";
import { getActiveProfessionals } from "@/core/professionals";
import { dayInTimeZone } from "@/core/time-zone";
import styles from "../../admin.module.scss";
import { getSessionBusiness } from "../../session";
import { AddAbsenceForm } from "./add-absence-form";
import { AddProfessionalForm } from "./add-professional-form";
import { DeactivateButton } from "./deactivate-button";
import { RemoveAbsenceButton } from "./remove-absence-button";

export const metadata: Metadata = { title: "Profesionales · Reservas" };

export default function ProfessionalsPage() {
  return (
    <>
      <h1>Profesionales</h1>
      <div className={styles.sections}>
        <section className={styles.section}>
          <h2>Equipo</h2>
          <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
            <ActiveProfessionals />
          </Suspense>
        </section>
        <section className={styles.section}>
          <h2>Agregar Profesional</h2>
          <AddProfessionalForm />
        </section>
        <section className={styles.section}>
          <h2>Ausencias</h2>
          <p className={styles.muted}>
            Días completos en que un Profesional no atiende (vacaciones, enfermedad). Esos días
            no recibe Reservas; las que ya tenía quedan en conflicto, para que las reasignes o
            canceles.
          </p>
          <Suspense fallback={<p className={styles.muted}>Cargando…</p>}>
            <Absences />
          </Suspense>
        </section>
      </div>
    </>
  );
}

async function ActiveProfessionals() {
  const business = await getSessionBusiness();
  const professionals = await getActiveProfessionals(business.id);

  if (professionals.length === 0) {
    return (
      <p className={styles.muted}>
        Todavía no hay Profesionales. Agregá al menos uno para poder recibir Reservas.
      </p>
    );
  }

  return (
    <ul className={styles.list}>
      {professionals.map((professional) => (
        <li key={professional.id} className={styles.listRow}>
          <span>{professional.name}</span>
          <DeactivateButton professionalId={professional.id} name={professional.name} />
        </li>
      ))}
    </ul>
  );
}

async function Absences() {
  const business = await getSessionBusiness();
  const now = new Date();
  const [absences, professionals] = await Promise.all([
    getUpcomingAbsences(business.id, now),
    getActiveProfessionals(business.id),
  ]);

  return (
    <>
      {absences.length === 0 ? (
        <p className={styles.muted}>No hay Ausencias cargadas.</p>
      ) : (
        <ul className={styles.list}>
          {absences.map((absence) => {
            const label = `${absence.professional.name} ${absenceDaysText(absence)}`;
            return (
              <li key={absence.id} className={styles.listRow}>
                <span>
                  <strong>{absence.professional.name}</strong>, {absenceDaysText(absence)}
                </span>
                <RemoveAbsenceButton absenceId={absence.id} label={label} />
              </li>
            );
          })}
        </ul>
      )}
      {professionals.length > 0 && (
        <AddAbsenceForm professionals={professionals} today={dayInTimeZone(now)} />
      )}
    </>
  );
}
