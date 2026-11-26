import { eq } from "drizzle-orm";
import {
  getRedirectTypeFromError,
  getURLFromRedirectError,
} from "next/dist/client/components/redirect";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SLOT_TAKEN_ERROR } from "@/core/reservations";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { setUpBusiness, theDayBefore } from "@/test/set-up-business";
import { TURNSTILE_TOKEN_FIELD } from "@/lib/turnstile-form";
import { reserveSlot } from "./actions";

// The public page's protections are simulated: Turnstile always accepts, the request
// comes from a fixed IP and no email goes out. The rest (core, database) is real.
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken: async () => true }));
vi.mock("@/lib/email-sender", () => ({ emailSender: { send: async () => {} } }));

/** 09:00 in Argentina on the Wednesday the test Business opens. */
const AT_0900 = "2026-11-11T12:00:00.000Z";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  data.set(TURNSTILE_TOKEN_FIELD, "token-de-prueba");
  return data;
}

const ana = { name: "Ana Pérez", email: "ana@mail.com", phone: "" };

/** Where the action sent the Customer, or what it returned if it did not redirect. */
async function outcome(action: Promise<unknown>) {
  try {
    return { returned: await action };
  } catch (error) {
    if (!isRedirectError(error)) throw error;
    return { url: getURLFromRedirectError(error), type: getRedirectTypeFromError(error) };
  }
}

beforeEach(() => {
  // The action reads the clock itself: the day before the Wednesday, far from any notice.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(theDayBefore);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Reserving from the public page", () => {
  it("after a Reservation, takes the Customer to its page, marked as just created", async () => {
    await setUpBusiness();

    const result = await outcome(reserveSlot("don-pepe", AT_0900, {}, form(ana)));

    const [reservation] = await db.select().from(reservations);
    expect(reservation).toMatchObject({ customerEmail: "ana@mail.com", status: "confirmed" });
    expect(result).toEqual({
      url: `/don-pepe/reserva/${reservation.cancellationToken}?nueva=1`,
      // Back from the Reservation goes to the day, not to the form already sent.
      type: "replace",
    });
  });

  it("when the block filled up meanwhile, stays on the form with what the Customer typed", async () => {
    await setUpBusiness();
    await outcome(reserveSlot("don-pepe", AT_0900, {}, form(ana)));
    const beto = { name: "Beto", email: "beto@mail.com", phone: "" };

    const result = await outcome(reserveSlot("don-pepe", AT_0900, {}, form(beto)));

    expect(result).toEqual({
      returned: { error: SLOT_TAKEN_ERROR, slotTaken: true, fields: beto },
    });
    expect(
      await db.select().from(reservations).where(eq(reservations.customerEmail, "beto@mail.com")),
    ).toEqual([]);
  });
});
