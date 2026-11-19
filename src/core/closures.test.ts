import { describe, expect, it } from "vitest";
import type { BusinessId } from "@/db/schema";
import { fakeEmailSender } from "@/test/fake-email-sender";
import { setUpBusiness, theDayBefore, THURSDAY, WEDNESDAY } from "@/test/set-up-business";
import { getAvailableSlots, getAvailableSlotsWithProfessionals } from "./available-slots";
import { cancelByBusiness } from "./cancellations";
import {
  addClosure,
  CLOSURE_NOT_FOUND_ERROR,
  closureExistsError,
  getReservationsOnClosures,
  getUpcomingClosures,
  INVALID_CLOSURE_DAY_ERROR,
  isClosed,
  PAST_CLOSURE_DAY_ERROR,
  removeClosure,
} from "./closures";
import { reserve, reserveByAdmin, SLOT_NOT_RESERVABLE_ERROR } from "./reservations";

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

async function reserveAt(businessId: BusinessId, startsAt: string, customerName = "Ana") {
  const result = await reserve(
    businessId,
    { startsAt, customerName, customerEmail: `${customerName.toLowerCase()}@mail.com` },
    theDayBefore,
    fakeEmailSender(),
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

async function close(businessId: BusinessId, day: string) {
  const result = await addClosure(businessId, day, theDayBefore);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("Closures", () => {
  it("a day with a Closure offers no Available slots; the other days still do", async () => {
    const { businessId } = await setUpBusiness({ openDays });

    await close(businessId, WEDNESDAY);

    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toEqual([]);
    expect(await getAvailableSlotsWithProfessionals(businessId, WEDNESDAY, theDayBefore)).toEqual(
      [],
    );
    expect(await getAvailableSlots(businessId, THURSDAY, theDayBefore)).toHaveLength(3);
    expect(await isClosed(businessId, WEDNESDAY)).toBe(true);
    expect(await isClosed(businessId, THURSDAY)).toBe(false);
  });

  it("neither the Customer nor the Admin can reserve on a day with a Closure", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    await close(businessId, WEDNESDAY);

    const byCustomer = await reserve(
      businessId,
      { startsAt: AT_0900, customerName: "Ana", customerEmail: "ana@mail.com" },
      theDayBefore,
      fakeEmailSender(),
    );
    const byAdmin = await reserveByAdmin(
      businessId,
      { startsAt: AT_0900, customerName: "Ana" },
      theDayBefore,
      fakeEmailSender(),
    );

    expect(byCustomer).toEqual({ ok: false, error: SLOT_NOT_RESERVABLE_ERROR });
    expect(byAdmin).toEqual({ ok: false, error: SLOT_NOT_RESERVABLE_ERROR });
  });

  it("removing the Closure gives the day its Available slots back", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    const { closure } = await close(businessId, WEDNESDAY);

    const result = await removeClosure(businessId, closure.id);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toHaveLength(3);
    expect(await getUpcomingClosures(businessId, theDayBefore)).toEqual([]);
  });

  it("lists the upcoming Closures by day, leaving the past ones out", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    await close(businessId, THURSDAY);
    await close(businessId, WEDNESDAY);

    const fromTuesday = await getUpcomingClosures(businessId, theDayBefore);
    const fromThursday = await getUpcomingClosures(businessId, new Date("2026-11-12T15:00:00Z"));

    expect(fromTuesday.map((closure) => closure.day)).toEqual([WEDNESDAY, THURSDAY]);
    expect(fromThursday.map((closure) => closure.day)).toEqual([THURSDAY]);
  });

  it("accepts today, but not a day that already passed", async () => {
    const { businessId } = await setUpBusiness({ openDays });

    const today = await addClosure(businessId, TUESDAY, theDayBefore);
    const yesterday = await addClosure(businessId, "2026-11-09", theDayBefore);

    expect(today.ok).toBe(true);
    expect(yesterday).toEqual({ ok: false, error: PAST_CLOSURE_DAY_ERROR });
  });

  it.each([["an empty day", ""], ["a day that does not exist", "2026-02-30"], ["text", "mañana"]])(
    "rejects %s",
    async (_case, day) => {
      const { businessId } = await setUpBusiness({ openDays });

      expect(await addClosure(businessId, day, theDayBefore)).toEqual({
        ok: false,
        error: INVALID_CLOSURE_DAY_ERROR,
      });
    },
  );

  it("rejects a second Closure on the same day", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    await close(businessId, WEDNESDAY);

    expect(await addClosure(businessId, WEDNESDAY, theDayBefore)).toEqual({
      ok: false,
      error: closureExistsError(WEDNESDAY),
    });
  });

  it.each([
    ["an id that does not exist", "00000000-0000-4000-8000-000000000000"],
    ["something that is not an id", "no-es-un-id"],
  ])("removing finds nothing for %s", async (_case, closureId) => {
    const { businessId } = await setUpBusiness({ openDays });

    expect(await removeClosure(businessId, closureId)).toEqual({
      ok: false,
      error: CLOSURE_NOT_FOUND_ERROR,
    });
  });
});

describe("Closures are isolated between Businesses", () => {
  it("a Closure of another Business does not close this one, nor is listed", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    const other = await setUpBusiness({ path: "otro", openDays });
    await close(other.businessId, WEDNESDAY);

    expect(await getAvailableSlots(businessId, WEDNESDAY, theDayBefore)).toHaveLength(3);
    expect(await getUpcomingClosures(businessId, theDayBefore)).toEqual([]);
    // Each Business can close the same day.
    expect((await addClosure(businessId, WEDNESDAY, theDayBefore)).ok).toBe(true);
  });

  it("cannot remove a Closure of another Business", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    const other = await setUpBusiness({ path: "otro", openDays });
    const { closure } = await close(other.businessId, WEDNESDAY);

    expect(await removeClosure(businessId, closure.id)).toEqual({
      ok: false,
      error: CLOSURE_NOT_FOUND_ERROR,
    });
    expect(await isClosed(other.businessId, WEDNESDAY)).toBe(true);
  });

  it("the Reservations of another Business are not Conflicting reservations of this one", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    const other = await setUpBusiness({ path: "otro", openDays });
    await reserveAt(other.businessId, AT_0900);

    const { conflicts } = await close(businessId, WEDNESDAY);

    expect(conflicts).toEqual([]);
    expect(await getReservationsOnClosures(businessId, theDayBefore)).toEqual([]);
  });
});

describe("Conflicting reservations because of a Closure", () => {
  it("adding a Closure returns the Confirmed Reservations of that day, which stay Confirmed", async () => {
    const { businessId } = await setUpBusiness({ openDays, professionals: 2 });
    const ana = await reserveAt(businessId, AT_0900, "Ana");
    const bruno = await reserveAt(businessId, AT_0900, "Bruno");
    await reserveAt(businessId, THURSDAY_AT_0900, "Carla");

    const { conflicts } = await close(businessId, WEDNESDAY);

    expect(conflicts.map((reservation) => reservation.id).sort()).toEqual(
      [ana.id, bruno.id].sort(),
    );
    expect(conflicts.every((reservation) => reservation.status === "confirmed")).toBe(true);
  });

  it("are listed while they remain, and stop being so once cancelled", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    const ana = await reserveAt(businessId, AT_0900, "Ana");
    const carla = await reserveAt(businessId, THURSDAY_AT_0900, "Carla");
    await close(businessId, WEDNESDAY);
    await close(businessId, THURSDAY);

    const before = await getReservationsOnClosures(businessId, theDayBefore);
    await cancelByBusiness(businessId, ana.id, theDayBefore, fakeEmailSender());
    const after = await getReservationsOnClosures(businessId, theDayBefore);

    expect(before.map((reservation) => reservation.customerName)).toEqual(["Ana", "Carla"]);
    expect(after.map((reservation) => reservation.id)).toEqual([carla.id]);
  });

  it("stop being so when the Closure is removed", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    await reserveAt(businessId, AT_0900);
    const { closure } = await close(businessId, WEDNESDAY);

    await removeClosure(businessId, closure.id);

    expect(await getReservationsOnClosures(businessId, theDayBefore)).toEqual([]);
  });

  it("a Reservation late on the day before, in Argentina, is not on the Closure day", async () => {
    // Open on Tuesdays until 23:00: a Reservation at 22:00 on Tuesday is already
    // Wednesday in UTC, but not in Argentina.
    const { businessId } = await setUpBusiness({
      openDays: [...openDays, { weekday: 2, opensAt: "21:00", closesAt: "23:00" }],
    });
    await reserveAt(businessId, "2026-11-11T01:00:00.000Z");

    await close(businessId, WEDNESDAY);

    expect(await getReservationsOnClosures(businessId, theDayBefore)).toEqual([]);
  });
});
