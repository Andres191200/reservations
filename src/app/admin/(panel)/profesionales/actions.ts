"use server";

import { refresh } from "next/cache";
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

  refresh();
  return {};
}
