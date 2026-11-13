import { describe, expect, it } from "vitest";
import { getAvailableSlots, getReservableDays } from "./available-slots";
import { registerBusiness } from "./businesses";
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
