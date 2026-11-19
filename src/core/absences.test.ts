import { describe, expect, it } from "vitest";
import type { BusinessId } from "@/db/schema";
import { fakeEmailSender } from "@/test/fake-email-sender";
import { setUpBusiness, theDayBefore, THURSDAY, WEDNESDAY } from "@/test/set-up-business";
import {
  ABSENCE_ENDS_BEFORE_START_ERROR,
  ABSENCE_NOT_FOUND_ERROR,
  addAbsence,
  getReservationsInAbsences,
  getUpcomingAbsences,
  INVALID_ABSENCE_DAYS_ERROR,
  overlappingAbsenceError,
  PAST_ABSENCE_ERROR,
  professionalAbsentError,
  removeAbsence,
} from "./absences";
import { getAvailableSlots, getAvailableSlotsWithProfessionals } from "./available-slots";
import { getDayReservations } from "./agenda";
import { deactivateProfessional, PROFESSIONAL_NOT_FOUND_ERROR, type Professional } from "./professionals";
import { getReassignmentOptions, reassign } from "./reassignments";
import { reserve, reserveByAdmin, SLOT_TAKEN_ERROR } from "./reservations";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.
// The Business is open on Wednesdays and Thursdays from 09:00 to 12:00 (Argentina), with
// 60-minute Reservations. Argentina is UTC-3: 09:00 there is 12:00 UTC. The clock is
// `theDayBefore` (Tuesday) unless a test says otherwise.

const AT_0900 = "2026-11-11T12:00:00.000Z";
const THURSDAY_AT_0900 = "2026-11-12T12:00:00.000Z";
const TUESDAY = "2026-11-10";

const openDays = [
  { weekday: 3, opensAt: "09:00", closesAt: "12:00" },
  { weekday: 4, opensAt: "09:00", closesAt: "12:00" },
];

async function absent(
  businessId: BusinessId,
  professional: Professional,
  startsOn: string,
  endsOn = startsOn,
) {
  const result = await addAbsence(
    businessId,
    { professionalId: professional.id, startsOn, endsOn },
    theDayBefore,
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

async function reserveFor(
  businessId: BusinessId,
  professional: Professional,
  startsAt = AT_0900,
  customerName = "Ana",
) {
  const result = await reserveByAdmin(
    businessId,
    { startsAt, customerName, professionalId: professional.id },
    theDayBefore,
    fakeEmailSender(),
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const names = (professionals: Professional[] | undefined) =>
  professionals?.map((professional) => professional.name);

describe("Absences and Available slots", () => {
  it("each block of an Absence day accepts one Reservation less", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 2 });

    await absent(businessId, professionals[0], WEDNESDAY);

    const slots = await getAvailableSlotsWithProfessionals(businessId, WEDNESDAY, theDayBefore);
    expect(slots.map((slot) => names(slot.freeProfessionals))).toEqual([
      ["Profesional 2"],
      ["Profesional 2"],
      ["Profesional 2"],
    ]);
    // The day after the Absence, both serve again.
    const thursday = await getAvailableSlotsWithProfessionals(businessId, THURSDAY, theDayBefore);
    expect(names(thursday[0].freeProfessionals)).toEqual(["Profesional 1", "Profesional 2"]);
  });

  it("with the only Professional Absent, the days of the Absence offer no Available slots", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays });

    await absent(businessId, professionals[0], WEDNESDAY, THURSDAY);

    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toEqual([]);
    expect(await getAvailableSlots(businessId, THURSDAY, theDayBefore)).toEqual([]);
  });

  it("Auto-assignment never chooses an Absent Professional", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 2 });
    await absent(businessId, professionals[0], WEDNESDAY);

    const first = await reserve(
      businessId,
      { startsAt: AT_0900, customerName: "Ana", customerEmail: "ana@mail.com" },
      theDayBefore,
      fakeEmailSender(),
    );
    const second = await reserve(
      businessId,
      { startsAt: AT_0900, customerName: "Bruno", customerEmail: "bruno@mail.com" },
      theDayBefore,
      fakeEmailSender(),
    );

    expect(first.ok && first.value.professionalId).toBe(professionals[1].id);
    expect(second).toEqual({ ok: false, error: SLOT_TAKEN_ERROR });
  });

  it("the Admin cannot choose an Absent Professional", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 2 });
    await absent(businessId, professionals[0], WEDNESDAY);

    const result = await reserveByAdmin(
      businessId,
      { startsAt: AT_0900, customerName: "Ana", professionalId: professionals[0].id },
      theDayBefore,
      fakeEmailSender(),
    );

    expect(result).toEqual({ ok: false, error: professionalAbsentError("Profesional 1") });
  });

  it("Reassignment neither offers nor accepts an Absent Professional", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 3 });
    const [first, second, third] = professionals;
    const ana = await reserveFor(businessId, first);
    await absent(businessId, second, WEDNESDAY);

    const options = await getReassignmentOptions(
      businessId,
      await getDayReservations(businessId, WEDNESDAY),
    );
    const result = await reassign(businessId, ana.id, second.id);

    expect(names(options.get(ana.id))).toEqual([third.name]);
    expect(result).toEqual({ ok: false, error: professionalAbsentError("Profesional 2") });
  });

  it("removing the Absence gives the Professional back to its days", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays });
    const { absence } = await absent(businessId, professionals[0], WEDNESDAY);

    expect(await removeAbsence(businessId, absence.id)).toEqual({ ok: true, value: undefined });
    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toHaveLength(3);
    expect(await getUpcomingAbsences(businessId, theDayBefore)).toEqual([]);
  });
});

describe("Adding and removing Absences", () => {
  it("lists those that have not ended, by start, with the Professional", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 2 });
    await absent(businessId, professionals[1], THURSDAY);
    await absent(businessId, professionals[0], TUESDAY, WEDNESDAY);

    const fromTuesday = await getUpcomingAbsences(businessId, theDayBefore);
    const fromThursday = await getUpcomingAbsences(businessId, new Date("2026-11-12T15:00:00Z"));

    expect(fromTuesday).toEqual([
      expect.objectContaining({ professional: professionals[0], startsOn: TUESDAY, endsOn: WEDNESDAY }),
      expect.objectContaining({ professional: professionals[1], startsOn: THURSDAY, endsOn: THURSDAY }),
    ]);
    expect(fromThursday.map((absence) => absence.professional.name)).toEqual(["Profesional 2"]);
  });

  it.each([
    ["an empty first day", "", WEDNESDAY, INVALID_ABSENCE_DAYS_ERROR],
    ["a last day that does not exist", WEDNESDAY, "2026-02-30", INVALID_ABSENCE_DAYS_ERROR],
    ["a last day before the first", THURSDAY, WEDNESDAY, ABSENCE_ENDS_BEFORE_START_ERROR],
    ["a first day that already passed", "2026-11-09", WEDNESDAY, PAST_ABSENCE_ERROR],
  ])("rejects %s", async (_case, startsOn, endsOn, error) => {
    const { businessId, professionals } = await setUpBusiness({ openDays });

    expect(
      await addAbsence(
        businessId,
        { professionalId: professionals[0].id, startsOn, endsOn },
        theDayBefore,
      ),
    ).toEqual({ ok: false, error });
  });

  it("rejects an Absence that overlaps another of the same Professional, not of another", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 2 });
    await absent(businessId, professionals[0], TUESDAY, WEDNESDAY);

    const overlapping = await addAbsence(
      businessId,
      { professionalId: professionals[0].id, startsOn: WEDNESDAY, endsOn: THURSDAY },
      theDayBefore,
    );
    const otherProfessional = await addAbsence(
      businessId,
      { professionalId: professionals[1].id, startsOn: WEDNESDAY, endsOn: THURSDAY },
      theDayBefore,
    );

    expect(overlapping).toEqual({ ok: false, error: overlappingAbsenceError("Profesional 1") });
    expect(otherProfessional.ok).toBe(true);
  });

  it("rejects a deactivated Professional, or one of another Business", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 2 });
    const other = await setUpBusiness({ path: "otro", openDays });
    await deactivateProfessional(businessId, professionals[1].id);

    for (const professionalId of [professionals[1].id, other.professionals[0].id, "no-es-un-id"]) {
      expect(
        await addAbsence(
          businessId,
          { professionalId, startsOn: WEDNESDAY, endsOn: WEDNESDAY },
          theDayBefore,
        ),
      ).toEqual({ ok: false, error: PROFESSIONAL_NOT_FOUND_ERROR });
    }
  });

  it("cannot remove an Absence of another Business", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    const other = await setUpBusiness({ path: "otro", openDays });
    const { absence } = await absent(other.businessId, other.professionals[0], WEDNESDAY);

    expect(await removeAbsence(businessId, absence.id)).toEqual({
      ok: false,
      error: ABSENCE_NOT_FOUND_ERROR,
    });
    expect(await getUpcomingAbsences(other.businessId, theDayBefore)).toHaveLength(1);
  });

  it("an Absence of another Business does not change this one's Available slots", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    const other = await setUpBusiness({ path: "otro", openDays });
    await absent(other.businessId, other.professionals[0], WEDNESDAY);

    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toHaveLength(3);
    expect(await getUpcomingAbsences(businessId, theDayBefore)).toEqual([]);
  });
});

describe("Conflicting reservations because of an Absence", () => {
  it("adding an Absence returns the Professional's Confirmed Reservations in those days", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 2 });
    const [first, second] = professionals;
    const ana = await reserveFor(businessId, first, AT_0900, "Ana");
    const carla = await reserveFor(businessId, first, THURSDAY_AT_0900, "Carla");
    await reserveFor(businessId, second, AT_0900, "Bruno");

    const { conflicts } = await absent(businessId, first, WEDNESDAY);

    expect(conflicts.map((reservation) => reservation.id)).toEqual([ana.id]);
    expect(await getReservationsInAbsences(businessId, theDayBefore)).toEqual([
      expect.objectContaining({ id: ana.id, status: "confirmed" }),
    ]);
    expect(carla.professionalId).toBe(first.id);
  });

  it("stop being so once reassigned to a Professional that can serve them", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 2 });
    const [first, second] = professionals;
    const ana = await reserveFor(businessId, first);
    await absent(businessId, first, WEDNESDAY);

    await reassign(businessId, ana.id, second.id);

    expect(await getReservationsInAbsences(businessId, theDayBefore)).toEqual([]);
  });

  it("stop being so when the Absence is removed", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays });
    await reserveFor(businessId, professionals[0]);
    const { absence } = await absent(businessId, professionals[0], WEDNESDAY);

    await removeAbsence(businessId, absence.id);

    expect(await getReservationsInAbsences(businessId, theDayBefore)).toEqual([]);
  });
});
