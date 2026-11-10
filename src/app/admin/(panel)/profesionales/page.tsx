import type { Metadata } from "next";
import { Suspense } from "react";
import { getActiveProfessionals } from "@/core/professionals";
import styles from "../../admin.module.scss";
import { getSessionBusiness } from "../../session";
import { AddProfessionalForm } from "./add-professional-form";
import { DeactivateButton } from "./deactivate-button";

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
