"use server";

import { refresh } from "next/cache";
import { addClosure as addClosureInCore, removeClosure as removeClosureInCore } from "@/core/closures";
import { withUnexpectedErrors } from "@/lib/action-errors";
import { getSessionBusiness } from "../../session";

export type AddClosureState = {
  error?: string;
  /** The day of the Closure just added. */
  added?: string;
  /** How many Confirmed Reservations that day became Conflicting reservations. */
  conflicts?: number;
};

export async function addClosure(
  _previous: AddClosureState,
  formData: FormData,
): Promise<AddClosureState> {
  return withUnexpectedErrors(async () => {
    // The Business always comes from the session, never from the form.
    const business = await getSessionBusiness();
    const day = String(formData.get("day") ?? "");

    const result = await addClosureInCore(business.id, day, new Date());
    if (!result.ok) return { error: result.error };

    refresh();
    return { added: result.value.closure.day, conflicts: result.value.conflicts.length };
  });
}

export type RemoveClosureState = { error?: string };

export async function removeClosure(
  _previous: RemoveClosureState,
  formData: FormData,
): Promise<RemoveClosureState> {
  return withUnexpectedErrors(async () => {
    const business = await getSessionBusiness();
    const closureId = String(formData.get("closureId") ?? "");

    const result = await removeClosureInCore(business.id, closureId);
    refresh();
    return result.ok ? {} : { error: result.error };
  });
}
