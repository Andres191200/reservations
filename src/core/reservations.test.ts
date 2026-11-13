import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { insertReservation } from "@/db/reservations";
import { reservations, type BusinessId } from "@/db/schema";
import { fakeEmailSender } from "@/test/fake-email-sender";
import { setUpBusiness, theDayBefore, WEDNESDAY } from "@/test/set-up-business";
import { getAvailableSlots } from "./available-slots";
import { cancelByCustomer } from "./cancellations";
import { addProfessional, deactivateProfessional } from "./professionals";
import {
  reserve,
  SLOT_NOT_RESERVABLE_ERROR,
  SLOT_TAKEN_ERROR,
  type NewReservation,
} from "./reservations";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.
// The clock (`now`) and the EmailSender are always simulated. The Business is open on Wednesdays from 09:00 to
// 12:00 (Argentina), with 60-minute Reservations. Argentina is UTC-3.

const AT_0900 = "2026-11-11T12:00:00.000Z";
const AT_1000 = "2026-11-11T13:00:00.000Z";

const customer = { customerName: "Ana Pérez", customerEmail: "ana@mail.com" };

function reserveAt(
  businessId: BusinessId,
  startsAt: string,
  overrides: Partial<NewReservation> = {},
  now = theDayBefore,
  emailSender = fakeEmailSender(),
) {
  return reserve(businessId, { startsAt, ...customer, ...overrides }, now, emailSender);
}

async function confirmedReservations(businessId: BusinessId) {
  return db.select().from(reservations).where(eq(reservations.businessId, businessId));
}

describe("Reserving an Available slot", () => {
  it("creates a Confirmed Reservation for the block, with the Customer's data", async () => {
    const { businessId, professionals } = await setUpBusiness();

    const result = await reserveAt(businessId, AT_0900, { customerPhone: "11 5555-1234" });

    expect(result).toEqual({
      ok: true,
      value: {
        id: expect.any(String),
        professionalId: professionals[0].id,
        startsAt: new Date(AT_0900),
        endsAt: new Date(AT_1000),
        status: "confirmed",
        cancellationToken: expect.any(String),
      },
    });
    const [stored] = await confirmedReservations(businessId);
    expect(stored).toMatchObject({
      customerName: "Ana Pérez",
      customerEmail: "ana@mail.com",
      customerPhone: "11 5555-1234",
    });
  });

  it("trims the data and stores the email in lowercase", async () => {
    const { businessId } = await setUpBusiness();

    await reserveAt(businessId, AT_0900, {
      customerName: "  Ana Pérez ",
      customerEmail: " Ana@Mail.COM ",
      customerPhone: "   ",
    });

    const [stored] = await confirmedReservations(businessId);
    expect(stored).toMatchObject({
      customerName: "Ana Pérez",
      customerEmail: "ana@mail.com",
      customerPhone: null,
    });
  });

  it("gives each Reservation its own unguessable cancellation token", async () => {
    const { businessId } = await setUpBusiness();

    const first = await reserveAt(businessId, AT_0900);
    const second = await reserveAt(businessId, AT_1000);

    if (!first.ok || !second.ok) throw new Error("Both should be created");
    // 32 random bytes in base64url.
    expect(first.value.cancellationToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.value.cancellationToken).not.toBe(second.value.cancellationToken);
  });

  it("removes the block from the Available slots once nobody is free", async () => {
    const { businessId } = await setUpBusiness();

    await reserveAt(businessId, AT_0900);

    const slots = await getAvailableSlots(businessId, WEDNESDAY, theDayBefore);
    expect(slots.map((slot) => slot.time)).toEqual(["10:00", "11:00"]);
  });
});

describe("Confirmation email", () => {
  it("sends the Customer the Business, day, time and Cancellation link", async () => {
    const { businessId } = await setUpBusiness();
    const emails = fakeEmailSender();

    const result = await reserveAt(businessId, AT_0900, {}, theDayBefore, emails);

    if (!result.ok) throw new Error(result.error);
    const link = `http://localhost:3000/don-pepe/reserva/${result.value.cancellationToken}`;
    expect(emails.sent).toHaveLength(1);
    const [email] = emails.sent;
    expect(email).toMatchObject({
      to: "ana@mail.com",
      fromName: "Negocio don-pepe",
      subject: "Reserva confirmada en Negocio don-pepe: Miércoles 11 de noviembre, 09:00",
    });
    expect(email.text).toContain("Tu Reserva en Negocio don-pepe quedó confirmada.");
    expect(email.text).toContain("Día: Miércoles 11 de noviembre");
    expect(email.text).toContain("Horario: 09:00 (hora de Argentina)");
    expect(email.text).toContain(link);
    expect(email.html).toContain(`href="${link}"`);
  });

  it("escapes the names typed by people in the HTML", async () => {
    const { businessId } = await setUpBusiness();
    const emails = fakeEmailSender();

    await reserveAt(businessId, AT_0900, { customerName: "<b>Ana</b>" }, theDayBefore, emails);

    expect(emails.sent[0].html).toContain("Hola, &lt;b&gt;Ana&lt;/b&gt;:");
    expect(emails.sent[0].text).toContain("Hola, <b>Ana</b>:");
  });

  it("is not sent when the Reservation is not created", async () => {
    const { businessId } = await setUpBusiness();
    const emails = fakeEmailSender();

    await reserveAt(businessId, AT_0900, { customerName: "" }, theDayBefore, emails);
    await reserveAt(businessId, "2026-11-11T11:00:00.000Z", {}, theDayBefore, emails);

    expect(emails.sent).toEqual([]);
  });

  it("if sending fails, the Reservation is created anyway and the error is logged", async () => {
    const { businessId } = await setUpBusiness();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await reserveAt(
      businessId,
      AT_0900,
      {},
      theDayBefore,
      fakeEmailSender({ failing: true }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [stored] = await confirmedReservations(businessId);
    expect(stored).toMatchObject({ id: result.value.id, status: "confirmed" });
    expect(logError).toHaveBeenCalledWith(
      `No se pudo enviar el email de confirmación de la Reserva ${result.value.id}:`,
      expect.objectContaining({ message: "Fallo simulado del proveedor de email" }),
    );
    logError.mockRestore();
  });
});

describe("Customer data", () => {
  it.each([
    ["an empty name", { customerName: "  " }, "Completá tu nombre."],
    ["an empty email", { customerEmail: "" }, "Completá tu email."],
    ["an invalid email", { customerEmail: "ana@" }, "El email no es válido."],
    [
      "a phone with letters",
      { customerPhone: "llamame" },
      "El teléfono solo puede tener números, espacios, +, - y paréntesis.",
    ],
  ])("rejects %s", async (_case, overrides, error) => {
    const { businessId } = await setUpBusiness();

    expect(await reserveAt(businessId, AT_0900, overrides)).toEqual({ ok: false, error });
    expect(await confirmedReservations(businessId)).toEqual([]);
  });

  it("does not require a phone", async () => {
    const { businessId } = await setUpBusiness();

    expect((await reserveAt(businessId, AT_0900)).ok).toBe(true);
  });
});

describe("A block that cannot be reserved, even if the form is forced", () => {
  it.each([
    ["before the opening", "2026-11-11T11:00:00.000Z"],
    ["a block that does not fit before the closing", "2026-11-11T15:00:00.000Z"],
    ["not at the start of a block", "2026-11-11T12:30:00.000Z"],
    ["on a day the Opening hours say is closed", "2026-11-12T12:00:00.000Z"],
    ["beyond the Maximum notice", "2026-12-16T12:00:00.000Z"],
    ["something that is not an instant", "mañana a las 9"],
  ])("rejects a Reservation %s", async (_case, startsAt) => {
    const { businessId } = await setUpBusiness();

    expect(await reserveAt(businessId, startsAt)).toEqual({
      ok: false,
      error: SLOT_NOT_RESERVABLE_ERROR,
    });
    expect(await confirmedReservations(businessId)).toEqual([]);
  });

  it("rejects a Reservation within the Minimum notice", async () => {
    const { businessId } = await setUpBusiness({ rules: { minimumNoticeHours: 2 } });
    const at0830 = new Date("2026-11-11T11:30:00Z");

    const result = await reserveAt(businessId, AT_1000, {}, at0830);

    expect(result).toEqual({ ok: false, error: SLOT_NOT_RESERVABLE_ERROR });
  });

  it("rejects a block of another Business's Opening hours", async () => {
    const { businessId } = await setUpBusiness({ openDays: [] });
    await setUpBusiness({ path: "otro" });

    expect(await reserveAt(businessId, AT_0900)).toEqual({
      ok: false,
      error: SLOT_NOT_RESERVABLE_ERROR,
    });
  });
});

describe("Auto-assignment", () => {
  it("assigns a free Professional and, once all are taken, says the block was just taken", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });

    const first = await reserveAt(businessId, AT_0900);
    const second = await reserveAt(businessId, AT_0900);
    const third = await reserveAt(businessId, AT_0900);

    const assigned = [first, second].map((result) => result.ok && result.value.professionalId);
    expect(assigned.sort()).toEqual(professionals.map((p) => p.id).sort());
    expect(third).toEqual({ ok: false, error: SLOT_TAKEN_ERROR });
  });

  it("prefers the free Professional with the fewest Reservations that day", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });
    const [first, second] = professionals;
    // Takes Profesional 1 (both have none; ties go by name).
    await reserveAt(businessId, AT_0900);

    const result = await reserveAt(businessId, AT_1000);

    expect(result.ok && result.value.professionalId).toBe(second.id);
    expect(result.ok && result.value.professionalId).not.toBe(first.id);
  });

  it("never assigns a deactivated Professional", async () => {
    const { businessId } = await setUpBusiness({ professionals: 0 });
    const carla = await addProfessional(businessId, { name: "Carla" });
    const martin = await addProfessional(businessId, { name: "Martín" });
    if (!carla.ok || !martin.ok) throw new Error("Professionals");
    await deactivateProfessional(businessId, carla.value.id);

    const first = await reserveAt(businessId, AT_0900);
    const second = await reserveAt(businessId, AT_0900);

    expect(first.ok && first.value.professionalId).toBe(martin.value.id);
    expect(second).toEqual({ ok: false, error: SLOT_TAKEN_ERROR });
  });
});

describe("Exclusion constraint", () => {
  it("rejects two overlapping Confirmed Reservations of the same Professional", async () => {
    const { businessId, professionals } = await setUpBusiness();
    const reservation = {
      businessId,
      professionalId: professionals[0].id,
      customerName: "Ana",
      customerEmail: "ana@mail.com",
      customerPhone: null,
    };

    const first = await insertReservation({
      ...reservation,
      startsAt: new Date(AT_0900),
      endsAt: new Date(AT_1000),
      cancellationToken: "a",
    });
    // Overlaps the second half of the first one.
    const overlapping = await insertReservation({
      ...reservation,
      startsAt: new Date("2026-11-11T12:30:00Z"),
      endsAt: new Date("2026-11-11T13:30:00Z"),
      cancellationToken: "b",
    });
    // Starts exactly when the first one ends: back to back is fine.
    const next = await insertReservation({
      ...reservation,
      startsAt: new Date(AT_1000),
      endsAt: new Date("2026-11-11T14:00:00Z"),
      cancellationToken: "c",
    });

    expect(first).toBeDefined();
    expect(overlapping).toBeUndefined();
    expect(next).toBeDefined();
  });

  it("leaves Cancelled Reservations out, so their block can be reserved again", async () => {
    const { businessId } = await setUpBusiness();
    const first = await reserveAt(businessId, AT_0900);
    if (!first.ok) throw new Error(first.error);
    await cancelByCustomer(businessId, first.value.cancellationToken, theDayBefore, fakeEmailSender());

    const again = await reserveAt(businessId, AT_0900);

    expect(again.ok).toBe(true);
  });
});

describe("Simultaneous Reservations", () => {
  it("for the last place of a block, only one ends up Confirmed", async () => {
    const { businessId } = await setUpBusiness({ professionals: 2 });
    await reserveAt(businessId, AT_0900);

    const results = await Promise.all([
      reserveAt(businessId, AT_0900, { customerName: "Bruno" }),
      reserveAt(businessId, AT_0900, { customerName: "Carla" }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, error: SLOT_TAKEN_ERROR },
    ]);
    const stored = await confirmedReservations(businessId);
    expect(stored.filter((r) => r.status === "confirmed")).toHaveLength(2);
  });

  it("when the chosen Professional gets taken, it falls back to another free one", async () => {
    const { businessId, professionals } = await setUpBusiness({ professionals: 2 });

    // Both read the same state and pick the same Professional; the database rejects one,
    // which then tries the other.
    const results = await Promise.all([
      reserveAt(businessId, AT_0900, { customerName: "Bruno" }),
      reserveAt(businessId, AT_0900, { customerName: "Carla" }),
    ]);

    expect(results.every((result) => result.ok)).toBe(true);
    const assigned = results.map((result) => result.ok && result.value.professionalId);
    expect(assigned.sort()).toEqual(professionals.map((p) => p.id).sort());
  });
});
