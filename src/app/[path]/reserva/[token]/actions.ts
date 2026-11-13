"use server";

import { refresh } from "next/cache";
import { cancelByCustomer, RESERVATION_NOT_FOUND_ERROR } from "@/core/cancellations";
import { findBusinessByPath } from "@/db/businesses";
import { emailSender } from "@/lib/email-sender";

export type CancelReservationState = { error?: string };

/**
 * Cancellation from the Customer's Cancellation link. `path` and `token` come from the
 * URL; the core checks that the token belongs to that Business and that the deadline has
 * not passed.
 */
export async function cancelReservation(
  path: string,
  token: string,
): Promise<CancelReservationState> {
  const business = await findBusinessByPath(path);
  if (!business) return { error: RESERVATION_NOT_FOUND_ERROR };

  const result = await cancelByCustomer(business.id, token, new Date(), emailSender);
  // Even when rejected (already Cancelled, past the deadline), the page shows how the
  // Reservation is now.
  refresh();
  return result.ok ? {} : { error: result.error };
}
