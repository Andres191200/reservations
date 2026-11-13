import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { reservations, type BusinessId, type ReservationId } from "@/db/schema";
import { fakeEmailSender } from "@/test/fake-email-sender";
import { setUpBusiness, theDayBefore, WEDNESDAY } from "@/test/set-up-business";
import { getAvailableSlots } from "./available-slots";
import {
  ALREADY_CANCELLED_ERROR,
  cancelByCustomer,
  getReservationForCustomer,
  PAST_CANCELLATION_DEADLINE_ERROR,
  RESERVATION_NOT_FOUND_ERROR,
} from "./cancellations";
import { reserve } from "./reservations";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.
// The clock (`now`) and the EmailSender are always simulated. The Business is open on
// Wednesdays from 09:00 to 12:00 (Argentina), with 60-minute Reservations and a 2-hour
// Cancellation deadline. Argentina is UTC-3.

const AT_0900 = "2026-11-11T12:00:00.000Z";

/** 07:00 in Argentina on the Wednesday: exactly 2 hours before the 09:00 Reservation. */
const atTheDeadline = new Date("2026-11-11T10:00:00Z");
const oneMinuteLate = new Date("2026-11-11T10:01:00Z");

/** A Confirmed Reservation at 09:00 on the Wednesday, made the day before. */
async function reserveAt0900(businessId: BusinessId) {
  const result = await reserve(
    businessId,
    { startsAt: AT_0900, customerName: "Ana Pérez", customerEmail: "ana@mail.com" },
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

describe("The Reservation seen through the Cancellation link", () => {
  it("shows the day, time and status of a Confirmed Reservation the Customer can cancel", async () => {
    const { businessId } = await setUpBusiness();
    const { id, cancellationToken } = await reserveAt0900(businessId);

    const reservation = await getReservationForCustomer(
      businessId,
      cancellationToken,
      theDayBefore,
    );

    expect(reservation).toEqual({
      id,
      startsAt: new Date(AT_0900),
      endsAt: new Date("2026-11-11T13:00:00.000Z"),
      status: "confirmed",
      cancelledBy: null,
      cancellableUntil: atTheDeadline,
      cancellableByCustomer: true,
    });
  });

  it.each([
    ["a token that does not exist", "no-existe"],
    ["an empty token", ""],
    ["a token far too long", "a".repeat(500)],
  ])("finds nothing for %s", async (_case, token) => {
    const { businessId } = await setUpBusiness();
    await reserveAt0900(businessId);

    expect(await getReservationForCustomer(businessId, token, theDayBefore)).toBeUndefined();
  });

  it("finds nothing for a token of another Business", async () => {
    const { businessId } = await setUpBusiness();
    const other = await setUpBusiness({ path: "otro" });
    const { cancellationToken } = await reserveAt0900(other.businessId);

    expect(
      await getReservationForCustomer(businessId, cancellationToken, theDayBefore),
    ).toBeUndefined();
  });

  it("past the Cancellation deadline, the Customer can no longer cancel it", async () => {
    const { businessId } = await setUpBusiness();
    const { cancellationToken } = await reserveAt0900(businessId);

    const atDeadline = await getReservationForCustomer(
      businessId,
      cancellationToken,
      atTheDeadline,
    );
    const late = await getReservationForCustomer(businessId, cancellationToken, oneMinuteLate);

    expect(atDeadline?.cancellableByCustomer).toBe(true);
    expect(late).toMatchObject({ status: "confirmed", cancellableByCustomer: false });
  });

  it("uses the Business's Cancellation deadline", async () => {
    const { businessId } = await setUpBusiness({ rules: { cancellationDeadlineHours: 24 } });
    const { cancellationToken } = await reserveAt0900(businessId);
    // 06:00 in Argentina the day before: 27 hours before.
    const twentySevenHoursBefore = new Date("2026-11-10T09:00:00Z");

    const early = await getReservationForCustomer(
      businessId,
      cancellationToken,
      twentySevenHoursBefore,
    );
    const late = await getReservationForCustomer(businessId, cancellationToken, theDayBefore);

    expect(early?.cancellableByCustomer).toBe(true);
    expect(late?.cancellableByCustomer).toBe(false);
  });
});

describe("Cancellation by the Customer", () => {
  it("cancels a Confirmed Reservation before the deadline and records that the Customer did it", async () => {
    const { businessId } = await setUpBusiness();
    const { id, cancellationToken } = await reserveAt0900(businessId);

    const result = await cancelByCustomer(
      businessId,
      cancellationToken,
      atTheDeadline,
      fakeEmailSender(),
    );

    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        id,
        status: "cancelled",
        cancelledBy: "customer",
        cancellableByCustomer: false,
      }),
    });
    expect(await stored(id)).toMatchObject({
      status: "cancelled",
      cancelledBy: "customer",
      cancelledAt: atTheDeadline,
    });
  });

  it("turns its time back into an Available slot", async () => {
    const { businessId } = await setUpBusiness();
    const { cancellationToken } = await reserveAt0900(businessId);
    const before = await getAvailableSlots(businessId, WEDNESDAY, theDayBefore);

    await cancelByCustomer(businessId, cancellationToken, theDayBefore, fakeEmailSender());

    const after = await getAvailableSlots(businessId, WEDNESDAY, theDayBefore);
    expect(before.map((slot) => slot.time)).toEqual(["10:00", "11:00"]);
    expect(after.map((slot) => slot.time)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("past the deadline, it is not cancelled and the Customer is told to contact the Business", async () => {
    const { businessId } = await setUpBusiness();
    const emails = fakeEmailSender();
    const { id, cancellationToken } = await reserveAt0900(businessId);

    const result = await cancelByCustomer(businessId, cancellationToken, oneMinuteLate, emails);

    expect(result).toEqual({ ok: false, error: PAST_CANCELLATION_DEADLINE_ERROR });
    expect(await stored(id)).toMatchObject({
      status: "confirmed",
      cancelledBy: null,
      cancelledAt: null,
    });
    expect(emails.sent).toEqual([]);
  });

  it("a Cancelled Reservation is shown as Cancelled and cannot be cancelled again", async () => {
    const { businessId } = await setUpBusiness();
    const emails = fakeEmailSender();
    const { id, cancellationToken } = await reserveAt0900(businessId);
    await cancelByCustomer(businessId, cancellationToken, theDayBefore, emails);

    const again = await cancelByCustomer(businessId, cancellationToken, atTheDeadline, emails);
    const seen = await getReservationForCustomer(businessId, cancellationToken, atTheDeadline);

    expect(again).toEqual({ ok: false, error: ALREADY_CANCELLED_ERROR });
    expect(seen).toMatchObject({
      status: "cancelled",
      cancelledBy: "customer",
      cancellableByCustomer: false,
    });
    // The first Cancellation is untouched, and only one email went out.
    expect(await stored(id)).toMatchObject({ cancelledAt: theDayBefore });
    expect(emails.sent).toHaveLength(1);
  });

  it("is not reactivated when its time is reserved again: that is a new Reservation", async () => {
    const { businessId } = await setUpBusiness();
    const first = await reserveAt0900(businessId);
    await cancelByCustomer(businessId, first.cancellationToken, theDayBefore, fakeEmailSender());

    const second = await reserveAt0900(businessId);

    expect(second.id).not.toBe(first.id);
    expect(await stored(first.id)).toMatchObject({ status: "cancelled" });
    expect(await stored(second.id)).toMatchObject({ status: "confirmed" });
  });

  it("does not cancel with a token under another Business's path", async () => {
    const { businessId } = await setUpBusiness();
    const other = await setUpBusiness({ path: "otro" });
    const { id, cancellationToken } = await reserveAt0900(other.businessId);

    const result = await cancelByCustomer(
      businessId,
      cancellationToken,
      theDayBefore,
      fakeEmailSender(),
    );

    expect(result).toEqual({ ok: false, error: RESERVATION_NOT_FOUND_ERROR });
    expect(await stored(id)).toMatchObject({ status: "confirmed" });
  });

  it("of two simultaneous Cancellations, only one goes through and sends the email", async () => {
    const { businessId } = await setUpBusiness();
    const emails = fakeEmailSender();
    const { cancellationToken } = await reserveAt0900(businessId);

    const results = await Promise.all([
      cancelByCustomer(businessId, cancellationToken, theDayBefore, emails),
      cancelByCustomer(businessId, cancellationToken, theDayBefore, emails),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, error: ALREADY_CANCELLED_ERROR },
    ]);
    expect(emails.sent).toHaveLength(1);
  });
});

describe("Cancellation email", () => {
  it("tells the Customer the Business, day and time, with a link to reserve again", async () => {
    const { businessId } = await setUpBusiness();
    const emails = fakeEmailSender();
    const { cancellationToken } = await reserveAt0900(businessId);

    await cancelByCustomer(businessId, cancellationToken, theDayBefore, emails);

    expect(emails.sent).toHaveLength(1);
    const [email] = emails.sent;
    expect(email).toMatchObject({
      to: "ana@mail.com",
      fromName: "Negocio don-pepe",
      subject: "Reserva cancelada en Negocio don-pepe: Miércoles 11 de noviembre, 09:00",
    });
    expect(email.text).toContain("Hola, Ana Pérez:");
    expect(email.text).toContain("Tu Reserva en Negocio don-pepe quedó cancelada.");
    expect(email.text).toContain("Día: Miércoles 11 de noviembre");
    expect(email.text).toContain("Horario: 09:00 (hora de Argentina)");
    expect(email.text).toContain("http://localhost:3000/don-pepe");
    expect(email.html).toContain('href="http://localhost:3000/don-pepe"');
  });

  it("if sending fails, the Cancellation stays made and the error is logged", async () => {
    const { businessId } = await setUpBusiness();
    const { id, cancellationToken } = await reserveAt0900(businessId);
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await cancelByCustomer(
      businessId,
      cancellationToken,
      theDayBefore,
      fakeEmailSender({ failing: true }),
    );

    expect(result.ok).toBe(true);
    expect(await stored(id)).toMatchObject({ status: "cancelled", cancelledBy: "customer" });
    expect(logError).toHaveBeenCalledWith(
      `No se pudo enviar el email de cancelación de la Reserva ${id}:`,
      expect.objectContaining({ message: "Fallo simulado del proveedor de email" }),
    );
    logError.mockRestore();
  });
});
