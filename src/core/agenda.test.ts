import { describe, expect, it } from "vitest";
import type { BusinessId } from "@/db/schema";
import { fakeEmailSender } from "@/test/fake-email-sender";
import { setUpBusiness, theDayBefore, THURSDAY, WEDNESDAY } from "@/test/set-up-business";
import { getAgendas, getDayReservations } from "./agenda";
import { cancelByCustomer } from "./cancellations";
import { deactivateProfessional } from "./professionals";
import { reserve } from "./reservations";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.
// The Business is open on Wednesdays from 09:00 to 12:00 (Argentina), with 60-minute
// Reservations. Argentina is UTC-3: 09:00 there is 12:00 UTC.

const AT_0900 = "2026-11-11T12:00:00.000Z";
const AT_1000 = "2026-11-11T13:00:00.000Z";

async function reserveAt(
  businessId: BusinessId,
  startsAt: string,
  customerName: string,
  customerPhone?: string,
) {
  const customerEmail = `${customerName.toLowerCase()}@mail.com`;
  const result = await reserve(
    businessId,
    { startsAt, customerName, customerEmail, customerPhone },
    theDayBefore,
    fakeEmailSender(),
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const summary = (reservations: Awaited<ReturnType<typeof getDayReservations>>) =>
  reservations.map((r) => `${r.startsAt.toISOString()} ${r.customerName} ${r.professional.name}`);

describe("The Reservations of a day", () => {
  it("lists them by time, then by Professional, with the Customer's contact data", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    // Auto-assignment: Ana goes to Profesional 1, Bruno to the one still without
    // Reservations (Profesional 2), and Carla to the only one free at 09:00.
    const ana = await reserveAt(businessId, AT_1000, "Ana");
    await reserveAt(businessId, AT_0900, "Bruno", "11 1234-5678");
    await reserveAt(businessId, AT_0900, "Carla");

    const reservations = await getDayReservations(businessId, WEDNESDAY);

    expect(summary(reservations)).toEqual([
      `${AT_0900} Carla Profesional 1`,
      `${AT_0900} Bruno Profesional 2`,
      `${AT_1000} Ana Profesional 1`,
    ]);
    expect(reservations[1]).toMatchObject({
      customerEmail: "bruno@mail.com",
      customerPhone: "11 1234-5678",
      professional: second,
    });
    expect(reservations[2]).toEqual({
      id: ana.id,
      startsAt: new Date(AT_1000),
      endsAt: new Date("2026-11-11T14:00:00.000Z"),
      status: "confirmed",
      cancelledBy: null,
      customerName: "Ana",
      customerEmail: "ana@mail.com",
      customerPhone: null,
      createdBy: "customer",
      professional: { ...first, active: true },
    });
  });

  it("includes the Cancelled ones, with who cancelled them", async () => {
    const { businessId } = await setUpBusiness({ professionals: 2 });
    const ana = await reserveAt(businessId, AT_0900, "Ana");
    await reserveAt(businessId, AT_0900, "Bruno");
    await cancelByCustomer(businessId, ana.cancellationToken, theDayBefore, fakeEmailSender());

    const reservations = await getDayReservations(businessId, WEDNESDAY);

    expect(reservations.map((r) => [r.customerName, r.status, r.cancelledBy])).toEqual([
      ["Ana", "cancelled", "customer"],
      ["Bruno", "confirmed", null],
    ]);
  });

  it("uses the day in Argentina, not in UTC", async () => {
    const { businessId } = await setUpBusiness({
      openDays: [{ weekday: 3, opensAt: "20:00", closesAt: "23:59" }],
    });
    // 22:00 on Wednesday in Argentina is already Thursday in UTC.
    await reserveAt(businessId, "2026-11-12T01:00:00.000Z", "Ana");

    expect(summary(await getDayReservations(businessId, WEDNESDAY))).toEqual([
      "2026-11-12T01:00:00.000Z Ana Profesional 1",
    ]);
    expect(await getDayReservations(businessId, THURSDAY)).toEqual([]);
  });

  it("keeps the Reservations of a deactivated Professional", async () => {
    const { businessId, professionals } = await setUpBusiness();
    await reserveAt(businessId, AT_0900, "Ana");
    await deactivateProfessional(businessId, professionals[0].id);

    const reservations = await getDayReservations(businessId, WEDNESDAY);

    expect(summary(reservations)).toEqual([`${AT_0900} Ana Profesional 1`]);
    expect(reservations[0].professional.active).toBe(false);
  });

  it.each([
    ["a day that does not exist", "2026-02-30"],
    ["something that is not a day", "mañana"],
  ])("has none for %s", async (_case, day) => {
    const { businessId } = await setUpBusiness();
    await reserveAt(businessId, AT_0900, "Ana");

    expect(await getDayReservations(businessId, day)).toEqual([]);
  });
});

describe("The Agenda of each Professional", () => {
  it("has the Reservations of each active Professional, also those without any", async () => {
    const { businessId } = await setUpBusiness({ professionals: 3 });
    await reserveAt(businessId, AT_1000, "Ana");
    await reserveAt(businessId, AT_0900, "Bruno");
    await reserveAt(businessId, AT_0900, "Carla");
    await reserveAt(businessId, AT_0900, "Diego");

    const agendas = await getAgendas(businessId, WEDNESDAY);

    expect(
      agendas.map(({ professional, reservations }) => [
        professional.name,
        professional.active,
        reservations.map((r) => r.customerName),
      ]),
    ).toEqual([
      ["Profesional 1", true, ["Diego", "Ana"]],
      ["Profesional 2", true, ["Bruno"]],
      ["Profesional 3", true, ["Carla"]],
    ]);
  });

  it("is empty on a day without Reservations", async () => {
    const { businessId } = await setUpBusiness({ professionals: 2 });
    await reserveAt(businessId, AT_0900, "Ana");

    const agendas = await getAgendas(businessId, THURSDAY);

    expect(agendas.map((agenda) => agenda.reservations)).toEqual([[], []]);
  });

  it("shows a deactivated Professional only on the days it has Reservations", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    await reserveAt(businessId, AT_0900, "Ana");
    await deactivateProfessional(businessId, professionals[0].id);

    const wednesday = await getAgendas(businessId, WEDNESDAY);
    const thursday = await getAgendas(businessId, THURSDAY);

    expect(
      wednesday.map(({ professional, reservations }) => [
        professional.name,
        professional.active,
        reservations.length,
      ]),
    ).toEqual([
      ["Profesional 2", true, 0],
      ["Profesional 1", false, 1],
    ]);
    expect(thursday.map((agenda) => agenda.professional.name)).toEqual(["Profesional 2"]);
  });
});

describe("Isolation between Businesses", () => {
  it("a Business only sees its own Reservations", async () => {
    const a = await setUpBusiness({ path: "negocio-a" });
    const b = await setUpBusiness({ path: "negocio-b" });
    await reserveAt(a.businessId, AT_0900, "Ana");
    await reserveAt(b.businessId, AT_1000, "Bruno");

    expect(summary(await getDayReservations(a.businessId, WEDNESDAY))).toEqual([
      `${AT_0900} Ana Profesional 1`,
    ]);
    expect(summary(await getDayReservations(b.businessId, WEDNESDAY))).toEqual([
      `${AT_1000} Bruno Profesional 1`,
    ]);
  });

  it("a Business only sees the Agendas of its own Professionals", async () => {
    const a = await setUpBusiness({ path: "negocio-a" });
    const b = await setUpBusiness({ path: "negocio-b" });
    await reserveAt(a.businessId, AT_0900, "Ana");
    // Even deactivated, a Professional with Reservations that day stays in its Business.
    await deactivateProfessional(a.businessId, a.professionals[0].id);

    const agendas = await getAgendas(b.businessId, WEDNESDAY);

    expect(agendas).toEqual([
      { professional: { ...b.professionals[0], active: true }, reservations: [] },
    ]);
  });
});
