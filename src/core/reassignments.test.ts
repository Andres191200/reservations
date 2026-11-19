import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { reservations, type BusinessId, type ReservationId } from "@/db/schema";
import { fakeEmailSender } from "@/test/fake-email-sender";
import { setUpBusiness, theDayBefore, WEDNESDAY } from "@/test/set-up-business";
import { getDayReservations } from "./agenda";
import { getAvailableSlots } from "./available-slots";
import { cancelByBusiness, RESERVATION_NOT_FOUND_ERROR } from "./cancellations";
import { deactivateProfessional, type Professional } from "./professionals";
import {
  alreadyAssignedError,
  busyForReassignmentError,
  CANCELLED_CANNOT_BE_REASSIGNED_ERROR,
  getReassignmentOptions,
  reassign,
} from "./reassignments";
import { PROFESSIONAL_NOT_FOUND_ERROR, reserveByAdmin } from "./reservations";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.
// The Business is open on Wednesdays from 09:00 to 12:00 (Argentina), with 60-minute
// Reservations. Argentina is UTC-3: 09:00 there is 12:00 UTC.

const AT_0900 = "2026-11-11T12:00:00.000Z";
const AT_1000 = "2026-11-11T13:00:00.000Z";

/** A Confirmed Reservation entered by the Admin for that Professional. */
async function reserveFor(
  businessId: BusinessId,
  professional: Professional,
  startsAt = AT_0900,
  customerName = "Ana Pérez",
) {
  const result = await reserveByAdmin(
    businessId,
    { startsAt, customerName, customerEmail: "ana@mail.com", professionalId: professional.id },
    theDayBefore,
    fakeEmailSender(),
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

async function stored(reservationId: ReservationId) {
  const [row] = await db.select().from(reservations).where(eq(reservations.id, reservationId));
  return row;
}

describe("Reassignment", () => {
  it("moves a Confirmed Reservation to a free Professional, keeping its time", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    const { id } = await reserveFor(businessId, first);
    const before = await stored(id);

    const result = await reassign(businessId, id, second.id);

    expect(result).toEqual({ ok: true, value: { professional: second } });
    expect(await stored(id)).toEqual({ ...before, professionalId: second.id });
  });

  it("frees the first Professional and takes the second, so the Available slots do not change", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    const { id } = await reserveFor(businessId, first);
    const before = await getAvailableSlots(businessId, WEDNESDAY, theDayBefore);

    await reassign(businessId, id, second.id);

    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toEqual(before);
    // The first Professional is free at 09:00 again: the Admin can enter a Reservation there.
    const entered = await reserveFor(businessId, first, AT_0900, "Bruno");
    expect(entered.professionalId).toBe(first.id);
  });

  it("rejects a Professional that already has a Reservation at that time", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    const { id } = await reserveFor(businessId, first);
    await reserveFor(businessId, second, AT_0900, "Bruno");

    const result = await reassign(businessId, id, second.id);

    expect(result).toEqual({ ok: false, error: busyForReassignmentError("Profesional 2") });
    expect(await stored(id)).toMatchObject({ professionalId: first.id });
  });

  it("a Professional busy at another time of the day is free for it", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    const { id } = await reserveFor(businessId, first);
    await reserveFor(businessId, second, AT_1000, "Bruno");

    expect((await reassign(businessId, id, second.id)).ok).toBe(true);
  });

  it("of two simultaneous Reassignments to the same Professional and time, only one goes through", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 3 });
    const [first, second, third] = professionals;
    const ana = await reserveFor(businessId, first);
    const bruno = await reserveFor(businessId, second, AT_0900, "Bruno");

    const results = await Promise.all([
      reassign(businessId, ana.id, third.id),
      reassign(businessId, bruno.id, third.id),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, error: busyForReassignmentError("Profesional 3") },
    ]);
  });

  it("cannot reassign a Cancelled Reservation", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    const { id } = await reserveFor(businessId, first);
    await cancelByBusiness(businessId, id, theDayBefore, fakeEmailSender());

    const result = await reassign(businessId, id, second.id);

    expect(result).toEqual({ ok: false, error: CANCELLED_CANNOT_BE_REASSIGNED_ERROR });
    expect(await stored(id)).toMatchObject({ professionalId: first.id, status: "cancelled" });
  });

  it("rejects the Professional it is already assigned to", async () => {
    const { businessId, professionals } = await setUpBusiness();
    const [first] = professionals;
    const { id } = await reserveFor(businessId, first);

    expect(await reassign(businessId, id, first.id)).toEqual({
      ok: false,
      error: alreadyAssignedError("Profesional 1"),
    });
  });

  it("rejects a deactivated Professional", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    const { id } = await reserveFor(businessId, first);
    await deactivateProfessional(businessId, second.id);

    expect(await reassign(businessId, id, second.id)).toEqual({
      ok: false,
      error: PROFESSIONAL_NOT_FOUND_ERROR,
    });
  });

  it.each([
    ["an id that does not exist", "00000000-0000-4000-8000-000000000000"],
    ["something that is not an id", "no-es-un-id"],
  ])("rejects %s as Professional", async (_case, professionalId) => {
    const { businessId, professionals } = await setUpBusiness();
    const { id } = await reserveFor(businessId, professionals[0]);

    expect(await reassign(businessId, id, professionalId)).toEqual({
      ok: false,
      error: PROFESSIONAL_NOT_FOUND_ERROR,
    });
  });

  it.each([
    ["an id that does not exist", "00000000-0000-4000-8000-000000000000"],
    ["something that is not an id", "no-es-un-id"],
  ])("finds no Reservation for %s", async (_case, reservationId) => {
    const { businessId, professionals } = await setUpBusiness();

    expect(await reassign(businessId, reservationId, professionals[0].id)).toEqual({
      ok: false,
      error: RESERVATION_NOT_FOUND_ERROR,
    });
  });

  it("cannot reassign a Reservation of another Business", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const other = await setUpBusiness({ path: "otro", professionals: 2 });
    const { id } = await reserveFor(other.businessId, other.professionals[0]);

    const result = await reassign(businessId, id, professionals[1].id);

    expect(result).toEqual({ ok: false, error: RESERVATION_NOT_FOUND_ERROR });
    expect(await stored(id)).toMatchObject({ professionalId: other.professionals[0].id });
  });

  it("cannot reassign to a Professional of another Business", async () => {
    const { businessId, professionals } = await setUpBusiness();
    const other = await setUpBusiness({ path: "otro" });
    const { id } = await reserveFor(businessId, professionals[0]);

    const result = await reassign(businessId, id, other.professionals[0].id);

    expect(result).toEqual({ ok: false, error: PROFESSIONAL_NOT_FOUND_ERROR });
    expect(await stored(id)).toMatchObject({ professionalId: professionals[0].id });
  });
});

describe("Reassignment options", () => {
  it("offers, for each Confirmed Reservation, the active Professionals free at its time", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 4 });
    const [first, second, third, fourth] = professionals;
    const ana = await reserveFor(businessId, first, AT_0900, "Ana");
    await reserveFor(businessId, second, AT_0900, "Bruno");
    const carla = await reserveFor(businessId, second, AT_1000, "Carla");
    await deactivateProfessional(businessId, fourth.id);

    const options = await getReassignmentOptions(
      businessId,
      await getDayReservations(businessId, WEDNESDAY),
    );

    // At 09:00, Profesional 2 is busy and Profesional 4 was deactivated.
    expect(options.get(ana.id)).toEqual([third]);
    // At 10:00, only Profesional 2 (its own) is busy.
    expect(options.get(carla.id)).toEqual([first, third]);
  });

  it("offers nothing for a Cancelled Reservation, and frees its time for the others", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    const ana = await reserveFor(businessId, first, AT_0900, "Ana");
    const bruno = await reserveFor(businessId, second, AT_0900, "Bruno");
    await cancelByBusiness(businessId, bruno.id, theDayBefore, fakeEmailSender());

    const options = await getReassignmentOptions(
      businessId,
      await getDayReservations(businessId, WEDNESDAY),
    );

    expect(options.get(bruno.id)).toBeUndefined();
    expect(options.get(ana.id)).toEqual([second]);
  });
});
