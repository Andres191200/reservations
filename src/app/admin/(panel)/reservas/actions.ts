"use server";

import { refresh } from "next/cache";
import { cancelByBusiness } from "@/core/cancellations";
import { emailSender } from "@/lib/email-sender";
import { getSessionBusiness } from "../../session";

export type CancelReservationState = { error?: string };

/**
 * Cancellation by the Business, from the panel. The Business comes from the session; the
 * Reservation comes from the form, and the core checks that it belongs to that Business.
 */
export async function cancelReservation(
  _previous: CancelReservationState,
  formData: FormData,
): Promise<CancelReservationState> {
  const business = await getSessionBusiness();
  const reservationId = String(formData.get("reservationId") ?? "");

  const result = await cancelByBusiness(business.id, reservationId, new Date(), emailSender);
  // Even when rejected (the Customer cancelled it a moment ago), the list shows how the
  // Reservation is now.
  refresh();
  return result.ok ? {} : { error: result.error };
}
