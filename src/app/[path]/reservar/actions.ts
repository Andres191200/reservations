"use server";

import { reserve, SLOT_TAKEN_ERROR } from "@/core/reservations";
import { dayInTimeZone, timeInTimeZone } from "@/core/time-zone";
import { findBusinessByPath } from "@/db/businesses";
import { capitalize, formatDay } from "../format";

/** What the Customer typed, so it comes back after a rejection. */
export type CustomerFields = { name: string; email: string; phone: string };

export type ReserveState = {
  error?: string;
  /** The block filled up meanwhile: the Customer has to choose another one. */
  slotTaken?: boolean;
  fields?: CustomerFields;
  /** The Confirmed Reservation, as the confirmation screen shows it. */
  confirmed?: { day: string; time: string };
};

/**
 * Creates the Reservation of the public page. `path` and `startsAt` come from the page
 * the Customer was on; the core checks them again, so forcing them changes nothing.
 */
export async function reserveSlot(
  path: string,
  startsAt: string,
  _previous: ReserveState,
  formData: FormData,
): Promise<ReserveState> {
  const fields: CustomerFields = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };

  const business = await findBusinessByPath(path);
  if (!business) return { error: "Este Negocio no existe.", fields };

  const result = await reserve(
    business.id,
    {
      startsAt,
      customerName: fields.name,
      customerEmail: fields.email,
      customerPhone: fields.phone,
    },
    new Date(),
  );
  if (!result.ok) {
    return { error: result.error, slotTaken: result.error === SLOT_TAKEN_ERROR, fields };
  }

  const reservedAt = result.value.startsAt;
  return {
    confirmed: {
      day: capitalize(formatDay(dayInTimeZone(reservedAt))),
      time: timeInTimeZone(reservedAt),
    },
  };
}
