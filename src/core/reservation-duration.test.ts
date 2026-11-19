import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { reservations, type BusinessId } from "@/db/schema";
import { fakeEmailSender } from "@/test/fake-email-sender";
import { setUpBusiness, theDayBefore, WEDNESDAY } from "@/test/set-up-business";
import { getAvailableSlots } from "./available-slots";
import {
  getReservationDurationSchedule,
  getReservationRules,
  saveReservationRules,
} from "./business-configuration";
import { reserve } from "./reservations";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.
// The clock is simulated. The Business opens every day from 09:00 to 12:00 (Argentina),
// with 60-minute Reservations and no Minimum notice. Argentina is UTC-3.

const TUESDAY = "2026-11-10";
/** 08:00 in Argentina on Tuesday 10 November: before the opening. */
const tuesdayMorning = new Date("2026-11-10T11:00:00Z");
const rules = { minimumNoticeHours: 0, maximumNoticeDays: 30, cancellationDeadlineHours: 2 };

const everyDay = [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
  weekday,
  opensAt: "09:00",
  closesAt: "12:00",
}));

async function changeDuration(businessId: BusinessId, minutes: number, now: Date) {
  const result = await saveReservationRules(
    businessId,
    { ...rules, reservationDurationMinutes: minutes },
    now,
  );
  if (!result.ok) throw new Error(result.error);
}

async function times(businessId: BusinessId, day: string, now = tuesdayMorning) {
  return (await getAvailableSlots(businessId, day, now)).map((slot) => slot.time);
}

describe("Changing the Reservation duration", () => {
  it("does not alter today's Available slots: the new one applies from tomorrow", async () => {
    const { businessId } = await setUpBusiness({ openDays: everyDay });

    await changeDuration(businessId, 45, tuesdayMorning);

    expect(await times(businessId, TUESDAY)).toEqual(["09:00", "10:00", "11:00"]);
    expect(await times(businessId, WEDNESDAY)).toEqual(["09:00", "09:45", "10:30", "11:15"]);
  });

  it("the next day, it is already today's", async () => {
    const { businessId } = await setUpBusiness({ openDays: everyDay });
    await changeDuration(businessId, 45, tuesdayMorning);
    const wednesdayMorning = new Date("2026-11-11T11:00:00Z");

    expect(await times(businessId, WEDNESDAY, wednesdayMorning)).toEqual([
      "09:00",
      "09:45",
      "10:30",
      "11:15",
    ]);
    expect(await getReservationDurationSchedule(businessId, wednesdayMorning)).toEqual({
      today: 45,
    });
  });

  it("tells from which day the new duration applies", async () => {
    const { businessId } = await setUpBusiness({ openDays: everyDay });

    await changeDuration(businessId, 45, tuesdayMorning);

    expect(await getReservationDurationSchedule(businessId, tuesdayMorning)).toEqual({
      today: 60,
      upcoming: { from: WEDNESDAY, minutes: 45 },
    });
    // The rules show what the Admin saved.
    expect(await getReservationRules(businessId)).toMatchObject({ reservationDurationMinutes: 45 });
  });

  it("two changes on the same day: the last one wins", async () => {
    const { businessId } = await setUpBusiness({ openDays: everyDay });

    await changeDuration(businessId, 45, tuesdayMorning);
    await changeDuration(businessId, 90, tuesdayMorning);

    expect(await getReservationDurationSchedule(businessId, tuesdayMorning)).toEqual({
      today: 60,
      upcoming: { from: WEDNESDAY, minutes: 90 },
    });
    expect(await times(businessId, WEDNESDAY)).toEqual(["09:00", "10:30"]);
  });

  it("going back to today's duration undoes the pending change", async () => {
    const { businessId } = await setUpBusiness({ openDays: everyDay });

    await changeDuration(businessId, 45, tuesdayMorning);
    await changeDuration(businessId, 60, tuesdayMorning);

    expect(await getReservationDurationSchedule(businessId, tuesdayMorning)).toEqual({
      today: 60,
    });
    expect(await times(businessId, WEDNESDAY)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("saving the other rules without touching the duration changes nothing about it", async () => {
    const { businessId } = await setUpBusiness({ openDays: everyDay });

    await saveReservationRules(
      businessId,
      { ...rules, minimumNoticeHours: 5, reservationDurationMinutes: 60 },
      tuesdayMorning,
    );

    expect(await getReservationDurationSchedule(businessId, tuesdayMorning)).toEqual({
      today: 60,
    });
    expect(await getReservationRules(businessId)).toMatchObject({ minimumNoticeHours: 5 });
  });

  it("existing Reservations keep their start and end, and the new blocks that overlap them are taken", async () => {
    const { businessId } = await setUpBusiness({ openDays: everyDay });
    const reserved = await reserve(
      businessId,
      { startsAt: "2026-11-11T12:00:00.000Z", customerName: "Ana", customerEmail: "ana@mail.com" },
      theDayBefore,
      fakeEmailSender(),
    );
    if (!reserved.ok) throw new Error(reserved.error);

    await changeDuration(businessId, 45, tuesdayMorning);

    const [stored] = await db
      .select({ startsAt: reservations.startsAt, endsAt: reservations.endsAt })
      .from(reservations)
      .where(eq(reservations.id, reserved.value.id));
    expect(stored).toEqual({
      startsAt: new Date("2026-11-11T12:00:00.000Z"),
      endsAt: new Date("2026-11-11T13:00:00.000Z"),
    });
    // 09:00–10:00 is taken: the 45-minute blocks at 09:00 and at 09:45 overlap it.
    expect(await times(businessId, WEDNESDAY)).toEqual(["10:30", "11:15"]);
  });

  it("a change of one Business does not touch another's duration", async () => {
    const { businessId } = await setUpBusiness({ openDays: everyDay });
    const other = await setUpBusiness({ path: "otro", openDays: everyDay });

    await changeDuration(other.businessId, 45, tuesdayMorning);

    expect(await times(businessId, WEDNESDAY)).toEqual(["09:00", "10:00", "11:00"]);
  });
});
