import { describe, expect, it } from "vitest";
import {
  getOpeningHours,
  getReservationRules,
  saveOpeningHours,
  saveReservationRules,
  type ReservationRulesInput,
} from "./business-configuration";
import { registerBusiness } from "./businesses";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.

async function register(path = "don-pepe") {
  const result = await registerBusiness({ name: path, path, adminEmail: `admin@${path}.com` });
  if (!result.ok) throw new Error(result.error);
  return result.value.business.id;
}

const weekdays9to18 = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  opensAt: "09:00",
  closesAt: "18:00",
}));

const validRules: ReservationRulesInput = {
  reservationDurationMinutes: 45,
  minimumNoticeHours: 3,
  maximumNoticeDays: 60,
  cancellationDeadlineHours: 24,
};

describe("A new Business", () => {
  it("starts with the default Reservation rules", async () => {
    const businessId = await register();

    expect(await getReservationRules(businessId)).toEqual({
      reservationDurationMinutes: 30,
      minimumNoticeHours: 1,
      maximumNoticeDays: 30,
      cancellationDeadlineHours: 2,
    });
  });

  it("starts with every day closed", async () => {
    const businessId = await register();

    expect(await getOpeningHours(businessId)).toEqual([]);
  });
});

describe("Opening hours", () => {
  it("saves one range per open day; the days left out are closed", async () => {
    const businessId = await register();

    const result = await saveOpeningHours(businessId, [
      { weekday: 6, opensAt: "10:00", closesAt: "14:30" },
      ...weekdays9to18,
    ]);

    expect(result.ok).toBe(true);
    expect(await getOpeningHours(businessId)).toEqual([
      ...weekdays9to18,
      { weekday: 6, opensAt: "10:00", closesAt: "14:30" },
    ]);
  });

  it("saving again replaces the whole week, closing the days no longer listed", async () => {
    const businessId = await register();
    await saveOpeningHours(businessId, weekdays9to18);

    await saveOpeningHours(businessId, [{ weekday: 2, opensAt: "08:00", closesAt: "12:00" }]);

    expect(await getOpeningHours(businessId)).toEqual([
      { weekday: 2, opensAt: "08:00", closesAt: "12:00" },
    ]);
  });

  it("can close every day", async () => {
    const businessId = await register();
    await saveOpeningHours(businessId, weekdays9to18);

    expect((await saveOpeningHours(businessId, [])).ok).toBe(true);
    expect(await getOpeningHours(businessId)).toEqual([]);
  });

  it.each([
    ["closes before it opens", "18:00", "09:00"],
    ["closes at the same time it opens", "09:00", "09:00"],
  ])("rejects a range that %s, without changing what was saved", async (_case, opensAt, closesAt) => {
    const businessId = await register();
    await saveOpeningHours(businessId, weekdays9to18);

    const result = await saveOpeningHours(businessId, [
      { weekday: 1, opensAt: "10:00", closesAt: "12:00" },
      { weekday: 3, opensAt, closesAt },
    ]);

    expect(result).toEqual({
      ok: false,
      error: "Miércoles: el cierre tiene que ser posterior a la apertura.",
    });
    expect(await getOpeningHours(businessId)).toEqual(weekdays9to18);
  });

  it.each([
    ["an empty time", { weekday: 1, opensAt: "", closesAt: "18:00" }],
    ["a time out of range", { weekday: 1, opensAt: "09:00", closesAt: "24:00" }],
    ["a time without minutes", { weekday: 1, opensAt: "9", closesAt: "18:00" }],
    ["a weekday out of range", { weekday: 8, opensAt: "09:00", closesAt: "18:00" }],
  ])("rejects %s", async (_case, day) => {
    const businessId = await register();

    expect((await saveOpeningHours(businessId, [day])).ok).toBe(false);
    expect(await getOpeningHours(businessId)).toEqual([]);
  });

  it("rejects two ranges for the same day", async () => {
    const businessId = await register();

    const result = await saveOpeningHours(businessId, [
      { weekday: 1, opensAt: "09:00", closesAt: "12:00" },
      { weekday: 1, opensAt: "14:00", closesAt: "18:00" },
    ]);

    expect(result.ok).toBe(false);
    expect(await getOpeningHours(businessId)).toEqual([]);
  });

  it("reports every invalid day at once", async () => {
    const businessId = await register();

    const result = await saveOpeningHours(businessId, [
      { weekday: 1, opensAt: "12:00", closesAt: "09:00" },
      { weekday: 5, opensAt: "12:00", closesAt: "09:00" },
    ]);

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/Lunes.*\n.*Viernes/),
    });
  });
});

describe("Reservation rules", () => {
  it("saves the Reservation duration, the notices and the cancellation deadline", async () => {
    const businessId = await register();

    const result = await saveReservationRules(businessId, validRules);

    expect(result).toEqual({ ok: true, value: validRules });
    expect(await getReservationRules(businessId)).toEqual(validRules);
  });

  it("accepts the values as typed in a form", async () => {
    const businessId = await register();

    const result = await saveReservationRules(businessId, {
      reservationDurationMinutes: " 20 ",
      minimumNoticeHours: "0",
      maximumNoticeDays: "7",
      cancellationDeadlineHours: "0",
    });

    expect(result.ok).toBe(true);
    expect(await getReservationRules(businessId)).toEqual({
      reservationDurationMinutes: 20,
      minimumNoticeHours: 0,
      maximumNoticeDays: 7,
      cancellationDeadlineHours: 0,
    });
  });

  it.each([
    ["an empty Reservation duration", { reservationDurationMinutes: "" }],
    ["a zero Reservation duration", { reservationDurationMinutes: 0 }],
    ["a Reservation duration that is not a whole number", { reservationDurationMinutes: 22.5 }],
    ["a Reservation duration that is not a number", { reservationDurationMinutes: "media hora" }],
    ["a negative minimum notice", { minimumNoticeHours: -1 }],
    ["a zero maximum notice", { maximumNoticeDays: 0 }],
    ["a negative cancellation deadline", { cancellationDeadlineHours: -2 }],
    ["a maximum notice not greater than the minimum", { minimumNoticeHours: 48, maximumNoticeDays: 2 }],
  ])("rejects %s, without changing what was saved", async (_case, change) => {
    const businessId = await register();

    const result = await saveReservationRules(businessId, { ...validRules, ...change });

    expect(result.ok).toBe(false);
    expect(await getReservationRules(businessId)).toMatchObject({ reservationDurationMinutes: 30 });
  });

  it("explains an empty field instead of saving a zero", async () => {
    const businessId = await register();

    const result = await saveReservationRules(businessId, { ...validRules, minimumNoticeHours: " " });

    expect(result).toEqual({ ok: false, error: "Completá la antelación mínima." });
  });
});

describe("Isolation between Businesses", () => {
  it("saving one Business's Opening hours does not touch the other's", async () => {
    const a = await register("negocio-a");
    const b = await register("negocio-b");
    await saveOpeningHours(b, [{ weekday: 7, opensAt: "10:00", closesAt: "13:00" }]);

    await saveOpeningHours(a, weekdays9to18);
    await saveOpeningHours(a, []);

    expect(await getOpeningHours(a)).toEqual([]);
    expect(await getOpeningHours(b)).toEqual([{ weekday: 7, opensAt: "10:00", closesAt: "13:00" }]);
  });

  it("saving one Business's Reservation rules does not touch the other's", async () => {
    const a = await register("negocio-a");
    const b = await register("negocio-b");

    await saveReservationRules(a, validRules);

    expect(await getReservationRules(a)).toEqual(validRules);
    expect(await getReservationRules(b)).toMatchObject({ reservationDurationMinutes: 30 });
  });
});
