"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import {
  absenceDaysText,
  addAbsence as addAbsenceInCore,
  removeAbsence as removeAbsenceInCore,
} from "@/core/absences";
import { getConflictingReservations } from "@/core/conflicts";
import {
  addProfessional as addProfessionalInCore,
  deactivateProfessional as deactivateProfessionalInCore,
} from "@/core/professionals";
import { getSessionBusiness } from "../../session";

export type AddProfessionalState = { error?: string; added?: string; name?: string };

export async function addProfessional(
  _previous: AddProfessionalState,
  formData: FormData,
): Promise<AddProfessionalState> {
  // The Business always comes from the session, never from the form.
  const business = await getSessionBusiness();
  const name = String(formData.get("name") ?? "");

  const result = await addProfessionalInCore(business.id, { name });
  if (!result.ok) return { error: result.error, name };

  refresh();
  return { added: result.value.name, name: "" };
}

export type DeactivateProfessionalState = { error?: string };

export async function deactivateProfessional(
  _previous: DeactivateProfessionalState,
  formData: FormData,
): Promise<DeactivateProfessionalState> {
  const business = await getSessionBusiness();
  const professionalId = String(formData.get("professionalId") ?? "");

  const result = await deactivateProfessionalInCore(business.id, professionalId);
  if (!result.ok) return { error: result.error };

  // Its Confirmed Reservations from today on become Conflicting reservations: show them
  // right away, so the Admin reassigns or cancels them.
  const conflicts = await getConflictingReservations(business.id, new Date());
  if (conflicts.some((reservation) => reservation.professional.id === professionalId)) {
    redirect("/admin/conflictos");
  }
  refresh();
  return {};
}

export type AddAbsenceState = {
  error?: string;
  /** The Absence just added, as the confirmation message says it. */
  added?: { professionalName: string; days: string; conflicts: number };
};

export async function addAbsence(
  _previous: AddAbsenceState,
  formData: FormData,
): Promise<AddAbsenceState> {
  const business = await getSessionBusiness();
  const result = await addAbsenceInCore(
    business.id,
    {
      professionalId: String(formData.get("professionalId") ?? ""),
      startsOn: String(formData.get("startsOn") ?? ""),
      endsOn: String(formData.get("endsOn") ?? ""),
    },
    new Date(),
  );
  if (!result.ok) return { error: result.error };

  refresh();
  const { absence, conflicts } = result.value;
  return {
    added: {
      professionalName: absence.professional.name,
      days: absenceDaysText(absence),
      conflicts: conflicts.length,
    },
  };
}

export type RemoveAbsenceState = { error?: string };

export async function removeAbsence(
  _previous: RemoveAbsenceState,
  formData: FormData,
): Promise<RemoveAbsenceState> {
  const business = await getSessionBusiness();
  const result = await removeAbsenceInCore(business.id, String(formData.get("absenceId") ?? ""));
  refresh();
  return result.ok ? {} : { error: result.error };
}
