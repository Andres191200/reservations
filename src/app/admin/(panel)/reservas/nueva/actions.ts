"use server";

import { refresh } from "next/cache";
import { getActiveProfessionals } from "@/core/professionals";
import { reserveByAdmin } from "@/core/reservations";
import { dayInTimeZone, timeInTimeZone } from "@/core/time-zone";
import { emailSender } from "@/lib/email-sender";
import { getSessionBusiness } from "../../../session";

export type EnterReservationState = {
  error?: string;
  /** Id of the last Reservation entered: the form starts over only when it changes. */
  lastEnteredId?: string;
  /** The Reservation just entered, as the confirmation message shows it. */
  entered?: {
    id: string;
    day: string;
    time: string;
    customerName: string;
    professionalName: string;
    emailSent: boolean;
  };
};

/**
 * Enters a Reservation from the panel. The Business comes from the session; the block and
 * the Professional come from the form, and the core checks them again.
 */
export async function enterReservation(
  previous: EnterReservationState,
  formData: FormData,
): Promise<EnterReservationState> {
  const business = await getSessionBusiness();
  const customerName = String(formData.get("name") ?? "");
  const customerEmail = String(formData.get("email") ?? "");

  const result = await reserveByAdmin(
    business.id,
    {
      startsAt: String(formData.get("startsAt") ?? ""),
      customerName,
      customerEmail,
      customerPhone: String(formData.get("phone") ?? ""),
      professionalId: String(formData.get("professionalId") ?? ""),
    },
    new Date(),
    emailSender,
  );
  // Either way the Available slots may have changed (this Reservation, or someone else's).
  refresh();
  if (!result.ok) return { error: result.error, lastEnteredId: previous.lastEnteredId };

  const reservation = result.value;
  const professional = (await getActiveProfessionals(business.id)).find(
    (candidate) => candidate.id === reservation.professionalId,
  );
  return {
    lastEnteredId: reservation.id,
    entered: {
      id: reservation.id,
      day: dayInTimeZone(reservation.startsAt),
      time: timeInTimeZone(reservation.startsAt),
      customerName: customerName.trim(),
      professionalName: professional?.name ?? "",
      emailSent: customerEmail.trim() !== "",
    },
  };
}
