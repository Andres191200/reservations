import { describe, expect, it } from "vitest";
import { addAbsence } from "./absences";
import {
  getAvailableSlots,
  getAvailableSlotsWithProfessionals,
  getReservableDays,
  getReservableDaysOverview,
} from "./available-slots";
import { saveReservationRules } from "./business-configuration";
import { registerBusiness } from "./businesses";
import { addClosure } from "./closures";
import { addProfessional, deactivateProfessional } from "./professionals";
import { reserve } from "./reservations";
import { fakeEmailSender } from "@/test/fake-email-sender";
import {
  setUpBusiness,
  theDayBefore,
  THURSDAY,
  WEDNESDAY,
} from "@/test/set-up-business";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.
// The clock (`now`) is always simulated. Argentina is UTC-3: 09:00 there is 12:00 UTC.

/** A Business open on Wednesdays from 09:00 to 12:00, with one Professional. */
async function setUp(options: Parameters<typeof setUpBusiness>[0] = {}) {
  return (await setUpBusiness(options)).businessId;
}

const times = (slots: { time: string }[]) => slots.map((slot) => slot.time);

describe("Available slots", () => {
  it("divides the Opening hours into consecutive blocks from the opening", async () => {
    const businessId = await setUp();

    const slots = await getAvailableSlots(businessId, WEDNESDAY, theDayBefore);

    expect(slots).toEqual([
      { time: "09:00", startsAt: new Date("2026-11-11T12:00:00Z") },
      { time: "10:00", startsAt: new Date("2026-11-11T13:00:00Z") },
      { time: "11:00", startsAt: new Date("2026-11-11T14:00:00Z") },
    ]);
  });

  it("does not offer a last block that does not fit whole before the closing", async () => {
    const businessId = await setUp({
      openDays: [{ weekday: 3, opensAt: "09:00", closesAt: "11:30" }],
      rules: { reservationDurationMinutes: 45 },
    });

    const slots = await getAvailableSlots(businessId, WEDNESDAY, theDayBefore);

    // 11:15 would end at 12:00, after the 11:30 closing.
    expect(times(slots)).toEqual(["09:00", "09:45", "10:30"]);
  });

  it("offers none on a day the Opening hours say is closed", async () => {
    const businessId = await setUp();

    expect(await getAvailableSlots(businessId, THURSDAY, theDayBefore)).toEqual([]);
  });

  it("offers none when the Business has no active Professionals", async () => {
    const businessId = await setUp({ professionals: 0 });

    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toEqual([]);
  });

  it("offers none when every Professional was deactivated", async () => {
    const businessId = await setUp({ professionals: 0 });
    const added = await addProfessional(businessId, { name: "Carla" });
    if (!added.ok) throw new Error(added.error);
    await deactivateProfessional(businessId, added.value.id);

    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toEqual([]);
  });

  it("offers none for something that is not a day", async () => {
    const businessId = await setUp();

    expect(await getAvailableSlots(businessId, "2026-02-30", theDayBefore)).toEqual([]);
    expect(await getAvailableSlots(businessId, "mañana", theDayBefore)).toEqual([]);
  });
});

describe("Minimum notice", () => {
  it("does not offer blocks that start before the Minimum notice", async () => {
    const businessId = await setUp({ rules: { minimumNoticeHours: 1 } });
    const at0930 = new Date("2026-11-11T12:30:00Z");

    const slots = await getAvailableSlots(businessId, WEDNESDAY, at0930);

    // 10:00 is only 30 minutes away.
    expect(times(slots)).toEqual(["11:00"]);
  });

  it("offers a block that starts exactly at the Minimum notice", async () => {
    const businessId = await setUp({ rules: { minimumNoticeHours: 1 } });
    const at0900 = new Date("2026-11-11T12:00:00Z");

    expect(times(await getAvailableSlots(businessId, WEDNESDAY, at0900))).toEqual([
      "10:00",
      "11:00",
    ]);
  });

  it("does not offer blocks that already started, even without a Minimum notice", async () => {
    const businessId = await setUp({ rules: { minimumNoticeHours: 0 } });
    const at1001 = new Date("2026-11-11T13:01:00Z");

    expect(times(await getAvailableSlots(businessId, WEDNESDAY, at1001))).toEqual(["11:00"]);
  });

  it("can leave a whole day without Available slots", async () => {
    const businessId = await setUp({ rules: { minimumNoticeHours: 24 } });

    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toEqual([]);
  });
});

describe("Maximum notice", () => {
  const today = new Date("2026-11-11T15:00:00Z");

  it("lets the Customer choose from today to the Maximum notice", () => {
    expect(getReservableDays({ maximumNoticeDays: 7 }, today)).toEqual({
      first: "2026-11-11",
      last: "2026-11-18",
    });
  });

  it("offers blocks on the last day of the Maximum notice, but not after it", async () => {
    const businessId = await setUp({ rules: { maximumNoticeDays: 7 } });

    expect(times(await getAvailableSlots(businessId, "2026-11-18", today))).toEqual([
      "09:00",
      "10:00",
      "11:00",
    ]);
    expect(await getAvailableSlots(businessId, "2026-11-25", today)).toEqual([]);
  });

  it("offers none on days already gone", async () => {
    const businessId = await setUp();

    expect(await getAvailableSlots(businessId, "2026-11-04", today)).toEqual([]);
  });
});

describe("Around midnight in Argentina", () => {
  // 02:30 UTC on the 12th is still 23:30 on the 11th in Argentina.
  const lateWednesday = new Date("2026-11-12T02:30:00Z");

  it("today is still the Argentina day, not the UTC one", () => {
    expect(getReservableDays({ maximumNoticeDays: 1 }, lateWednesday)).toEqual({
      first: "2026-11-11",
      last: "2026-11-12",
    });
  });

  it("the Maximum notice counts from the Argentina day", async () => {
    const businessId = await setUp({
      openDays: [{ weekday: 5, opensAt: "09:00", closesAt: "12:00" }],
      rules: { maximumNoticeDays: 1 },
    });

    // Friday the 13th is two days away in Argentina, though only one in UTC.
    expect(await getAvailableSlots(businessId, "2026-11-13", lateWednesday)).toEqual([]);
  });

  it("a block right after midnight belongs to the next Argentina day", async () => {
    const businessId = await setUp({
      openDays: [{ weekday: 4, opensAt: "00:00", closesAt: "02:00" }],
      rules: { minimumNoticeHours: 0 },
    });

    expect(await getAvailableSlots(businessId, THURSDAY, lateWednesday)).toEqual([
      { time: "00:00", startsAt: new Date("2026-11-12T03:00:00Z") },
      { time: "01:00", startsAt: new Date("2026-11-12T04:00:00Z") },
    ]);
  });

  it("a block late on the day starts on the next UTC day", async () => {
    const businessId = await setUp({
      openDays: [{ weekday: 3, opensAt: "21:00", closesAt: "23:00" }],
    });

    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toEqual([
      { time: "21:00", startsAt: new Date("2026-11-12T00:00:00Z") },
      { time: "22:00", startsAt: new Date("2026-11-12T01:00:00Z") },
    ]);
  });
});

describe("Confirmed Reservations", () => {
  const at0900 = new Date("2026-11-11T12:00:00Z");

  async function reserveAt(businessId: Awaited<ReturnType<typeof setUp>>, startsAt: Date) {
    const result = await reserve(
      businessId,
      { startsAt: startsAt.toISOString(), customerName: "Ana", customerEmail: "ana@mail.com" },
      theDayBefore,
      fakeEmailSender(),
    );
    if (!result.ok) throw new Error(result.error);
  }

  it("a block stays available while one active Professional is free in it", async () => {
    const businessId = await setUp({ professionals: 2 });

    await reserveAt(businessId, at0900);

    expect(times(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore))).toEqual([
      "09:00",
      "10:00",
      "11:00",
    ]);
  });

  it("a block stops being available when every active Professional has a Reservation", async () => {
    const businessId = await setUp({ professionals: 2 });

    await reserveAt(businessId, at0900);
    await reserveAt(businessId, at0900);

    expect(times(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore))).toEqual([
      "10:00",
      "11:00",
    ]);
  });

  it("a Reservation of another Business does not take up the block", async () => {
    const businessId = await setUp();
    const other = await setUp({ path: "otro" });

    await reserveAt(other, at0900);

    expect(times(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore))).toEqual([
      "09:00",
      "10:00",
      "11:00",
    ]);
  });
});

describe("Available slots with their free Professionals (for the panel)", () => {
  it("lists, for each Available slot, the Professionals still free in it", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    // 09:00: Profesional 1 takes it (ties go by name).
    await reserve(
      businessId,
      { startsAt: "2026-11-11T12:00:00Z", customerName: "Ana", customerEmail: "ana@mail.com" },
      theDayBefore,
      fakeEmailSender(),
    );

    const slots = await getAvailableSlotsWithProfessionals(businessId, WEDNESDAY, theDayBefore);

    expect(slots.map((slot) => [slot.time, slot.freeProfessionals])).toEqual([
      ["09:00", [second]],
      ["10:00", [first, second]],
      ["11:00", [first, second]],
    ]);
  });

  it("leaves out the blocks where nobody is free, like for the Customer", async () => {
    const businessId = await setUp();
    await reserve(
      businessId,
      { startsAt: "2026-11-11T12:00:00Z", customerName: "Ana", customerEmail: "ana@mail.com" },
      theDayBefore,
      fakeEmailSender(),
    );

    const slots = await getAvailableSlotsWithProfessionals(businessId, WEDNESDAY, theDayBefore);

    expect(times(slots)).toEqual(times(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)));
    expect(times(slots)).toEqual(["10:00", "11:00"]);
  });
});

describe("Isolation between Businesses", () => {
  it("uses only the Business's own Opening hours and Professionals", async () => {
    const withoutProfessionals = await setUp({ professionals: 0 });
    const other = await registerBusiness({ name: "Otro", path: "otro", adminEmail: "a@otro.com" });
    if (!other.ok) throw new Error(other.error);
    await addProfessional(other.value.business.id, { name: "Carla" });

    expect(await getAvailableSlots(withoutProfessionals, WEDNESDAY, theDayBefore)).toEqual([]);
    expect(await getAvailableSlots(other.value.business.id, WEDNESDAY, theDayBefore)).toEqual([]);
  });
});

// --- The Reservable days at once (public page) --------------------------------------

/** Open on Wednesdays and Thursdays from 09:00 to 12:00. */
const WEDNESDAY_AND_THURSDAY = [
  { weekday: 3, opensAt: "09:00", closesAt: "12:00" },
  { weekday: 4, opensAt: "09:00", closesAt: "12:00" },
];

/** Wednesday 11:30 in Argentina: its last block (11:00) already started. */
const lateWednesday = new Date("2026-11-11T14:30:00Z");

async function reserveEveryBlock(businessId: Awaited<ReturnType<typeof setUp>>, day: string) {
  for (const slot of await getAvailableSlots(businessId, day, theDayBefore)) {
    const result = await reserve(
      businessId,
      { startsAt: slot.startsAt.toISOString(), customerName: "Ana", customerEmail: "ana@mail.com" },
      theDayBefore,
      fakeEmailSender(),
    );
    if (!result.ok) throw new Error(result.error);
  }
}

describe("The first Reservable day with Available slots", () => {
  it("is today while today still has Available slots", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });
    const at0900 = new Date("2026-11-11T12:00:00Z");

    const overview = await getReservableDaysOverview(businessId, at0900);

    expect(overview.firstDayWithSlots()).toBe(WEDNESDAY);
  });

  it("skips today once its last block has started", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });

    const overview = await getReservableDaysOverview(businessId, lateWednesday);

    expect(overview.firstDayWithSlots()).toBe(THURSDAY);
  });

  it("skips the weekdays the Business does not open", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });

    // theDayBefore is a Tuesday.
    expect((await getReservableDaysOverview(businessId, theDayBefore)).firstDayWithSlots()).toBe(
      WEDNESDAY,
    );
  });

  it("skips a day with a Closure", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });
    await addClosure(businessId, WEDNESDAY, theDayBefore);

    expect((await getReservableDaysOverview(businessId, theDayBefore)).firstDayWithSlots()).toBe(
      THURSDAY,
    );
  });

  it("skips a day where every block is reserved", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });
    await reserveEveryBlock(businessId, WEDNESDAY);

    expect((await getReservableDaysOverview(businessId, theDayBefore)).firstDayWithSlots()).toBe(
      THURSDAY,
    );
  });

  it("skips a day where every Professional is Absent", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays: WEDNESDAY_AND_THURSDAY });
    await addAbsence(
      businessId,
      { professionalId: professionals[0].id, startsOn: WEDNESDAY, endsOn: WEDNESDAY },
      theDayBefore,
    );

    expect((await getReservableDaysOverview(businessId, theDayBefore)).firstDayWithSlots()).toBe(
      THURSDAY,
    );
  });

  it("looks as far as the last day of the Maximum notice", async () => {
    // Open only on Wednesdays; from Thursday the 12th, the next one is the 18th.
    const businessId = await setUp({ rules: { maximumNoticeDays: 6 } });
    const thursday = new Date("2026-11-12T15:00:00Z");

    expect((await getReservableDaysOverview(businessId, thursday)).firstDayWithSlots()).toBe(
      "2026-11-18",
    );
  });

  it("is none when no Reservable day has Available slots", async () => {
    const businessId = await setUp({ rules: { maximumNoticeDays: 5 } });
    const thursday = new Date("2026-11-12T15:00:00Z");

    expect(
      (await getReservableDaysOverview(businessId, thursday)).firstDayWithSlots(),
    ).toBeUndefined();
  });

  it("can start looking from a later day", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });

    const overview = await getReservableDaysOverview(businessId, theDayBefore);

    expect(overview.firstDayWithSlots(THURSDAY)).toBe(THURSDAY);
    expect(overview.firstDayWithSlots("2026-11-13")).toBe("2026-11-18");
  });

  it("does not see the Closures or Reservations of another Business", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });
    const other = await setUp({ path: "otro", openDays: WEDNESDAY_AND_THURSDAY });
    await addClosure(other, WEDNESDAY, theDayBefore);
    await reserveEveryBlock(other, THURSDAY);

    const overview = await getReservableDaysOverview(businessId, theDayBefore);

    expect(overview.firstDayWithSlots()).toBe(WEDNESDAY);
    expect(overview.firstDayWithSlots(THURSDAY)).toBe(THURSDAY);
  });
});

describe("A Reservable day in the overview", () => {
  it("has the same Available slots as when asking for that day alone", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY, professionals: 2 });
    await reserve(
      businessId,
      { startsAt: "2026-11-11T12:00:00Z", customerName: "Ana", customerEmail: "ana@mail.com" },
      theDayBefore,
      fakeEmailSender(),
    );
    const at0930 = new Date("2026-11-11T12:30:00Z");

    const overview = await getReservableDaysOverview(businessId, at0930);

    for (const day of [WEDNESDAY, THURSDAY]) {
      expect(overview.availabilityOn(day).slots).toEqual(
        await getAvailableSlots(businessId, day, at0930),
      );
    }
    expect(times(overview.availabilityOn(WEDNESDAY).slots)).toEqual(["10:00", "11:00"]);
    expect(overview.availabilityOn(WEDNESDAY).emptyReason).toBeUndefined();
  });

  it("without Available slots because the Business does not open that weekday", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });

    const friday = (await getReservableDaysOverview(businessId, theDayBefore)).availabilityOn(
      "2026-11-13",
    );

    expect(friday).toMatchObject({ slots: [], emptyReason: "weekdayClosed" });
  });

  it("without Available slots because of a Closure", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });
    await addClosure(businessId, WEDNESDAY, theDayBefore);

    const overview = await getReservableDaysOverview(businessId, theDayBefore);

    expect(overview.availabilityOn(WEDNESDAY)).toMatchObject({ slots: [], emptyReason: "closure" });
  });

  it("a Closure on a weekday it does not open counts as that weekday being closed", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });
    await addClosure(businessId, "2026-11-13", theDayBefore);

    const overview = await getReservableDaysOverview(businessId, theDayBefore);

    expect(overview.availabilityOn("2026-11-13").emptyReason).toBe("weekdayClosed");
  });

  it("without Available slots left: blocks already started, reserved or Absent", async () => {
    const { businessId, professionals } = await setUpBusiness({
      openDays: [...WEDNESDAY_AND_THURSDAY, { weekday: 5, opensAt: "09:00", closesAt: "12:00" }],
    });
    await reserveEveryBlock(businessId, THURSDAY);
    await addAbsence(
      businessId,
      { professionalId: professionals[0].id, startsOn: "2026-11-13", endsOn: "2026-11-13" },
      theDayBefore,
    );

    const overview = await getReservableDaysOverview(businessId, lateWednesday);

    for (const day of [WEDNESDAY, THURSDAY, "2026-11-13"]) {
      expect(overview.availabilityOn(day)).toMatchObject({ slots: [], emptyReason: "noneLeft" });
    }
  });

  it("carries the Reservation duration in effect that day", async () => {
    const businessId = await setUp({ openDays: WEDNESDAY_AND_THURSDAY });
    // Saved on Wednesday: the new duration applies from Thursday.
    await saveReservationRules(
      businessId,
      {
        reservationDurationMinutes: 30,
        minimumNoticeHours: 0,
        maximumNoticeDays: 30,
        cancellationDeadlineHours: 2,
      },
      new Date("2026-11-11T12:00:00Z"),
    );

    const overview = await getReservableDaysOverview(businessId, new Date("2026-11-11T12:00:00Z"));

    expect(overview.availabilityOn(WEDNESDAY).durationMinutes).toBe(60);
    expect(overview.availabilityOn(THURSDAY).durationMinutes).toBe(30);
    expect(times(overview.availabilityOn(THURSDAY).slots)).toHaveLength(6);
  });

  it("knows the Reservable days and the Reservation rules", async () => {
    const businessId = await setUp({ rules: { maximumNoticeDays: 7, cancellationDeadlineHours: 24 } });

    const overview = await getReservableDaysOverview(businessId, theDayBefore);

    expect(overview.reservableDays).toEqual({ first: "2026-11-10", last: "2026-11-17" });
    expect(overview.rules.cancellationDeadlineHours).toBe(24);
    expect(overview.openingHours).toEqual([{ weekday: 3, opensAt: "09:00", closesAt: "12:00" }]);
  });
});
