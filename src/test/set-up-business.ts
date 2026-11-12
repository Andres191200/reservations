import {
  saveOpeningHours,
  saveReservationRules,
  type OpenDay,
  type ReservationRulesInput,
} from "@/core/business-configuration";
import { registerBusiness } from "@/core/businesses";
import { addProfessional, type Professional } from "@/core/professionals";

// Dates the tests share. Argentina is UTC-3: 09:00 there is 12:00 UTC.
// 2026-11-11 is a Wednesday (weekday 3); 2026-11-12, a Thursday (weekday 4).
export const WEDNESDAY = "2026-11-11";
export const THURSDAY = "2026-11-12";

/** The day before WEDNESDAY, at noon in Argentina: far from any notice. */
export const theDayBefore = new Date("2026-11-10T15:00:00Z");

const defaultRules: ReservationRulesInput = {
  reservationDurationMinutes: 60,
  minimumNoticeHours: 0,
  maximumNoticeDays: 30,
  cancellationDeadlineHours: 2,
};

/**
 * Registers a Business open on Wednesdays from 09:00 to 12:00, with Professionals named
 * "Profesional 1", "Profesional 2"... (one, unless told otherwise).
 */
export async function setUpBusiness(
  options: {
    path?: string;
    openDays?: OpenDay[];
    rules?: Partial<ReservationRulesInput>;
    professionals?: number;
  } = {},
) {
  const path = options.path ?? "don-pepe";
  const registration = await registerBusiness({
    name: `Negocio ${path}`,
    path,
    adminEmail: `admin@${path}.com`,
  });
  if (!registration.ok) throw new Error(registration.error);
  const businessId = registration.value.business.id;

  const openDays = options.openDays ?? [{ weekday: 3, opensAt: "09:00", closesAt: "12:00" }];
  if (!(await saveOpeningHours(businessId, openDays)).ok) throw new Error("Opening hours");
  const rules = await saveReservationRules(businessId, { ...defaultRules, ...options.rules });
  if (!rules.ok) throw new Error(rules.error);

  const professionals: Professional[] = [];
  for (let i = 0; i < (options.professionals ?? 1); i++) {
    const added = await addProfessional(businessId, { name: `Profesional ${i + 1}` });
    if (!added.ok) throw new Error(added.error);
    professionals.push(added.value);
  }
  return { businessId, professionals };
}
