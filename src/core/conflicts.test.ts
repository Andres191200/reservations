import { describe, expect, it } from "vitest";
import type { BusinessId } from "@/db/schema";
import { fakeEmailSender } from "@/test/fake-email-sender";
import { setUpBusiness, theDayBefore, THURSDAY, WEDNESDAY } from "@/test/set-up-business";
import { addAbsence } from "./absences";
import { cancelByBusiness } from "./cancellations";
import { addClosure } from "./closures";
import { getConflictingReservations } from "./conflicts";
import { deactivateProfessional, type Professional } from "./professionals";
import { reassign } from "./reassignments";
import { reserveByAdmin } from "./reservations";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.
// The Business is open on Wednesdays and Thursdays from 09:00 to 12:00 (Argentina), with
// 60-minute Reservations. Argentina is UTC-3: 09:00 there is 12:00 UTC.

const AT_0900 = "2026-11-11T12:00:00.000Z";
const AT_1000 = "2026-11-11T13:00:00.000Z";
const THURSDAY_AT_0900 = "2026-11-12T12:00:00.000Z";

const openDays = [
  { weekday: 3, opensAt: "09:00", closesAt: "12:00" },
  { weekday: 4, opensAt: "09:00", closesAt: "12:00" },
];

async function reserveFor(
  businessId: BusinessId,
  professional: Professional,
  startsAt: string,
  customerName: string,
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

const summary = (conflicts: Awaited<ReturnType<typeof getConflictingReservations>>) =>
  conflicts.map((conflict) => `${conflict.customerName} ${conflict.reason}`);

describe("Conflicting reservations", () => {
  it("brings together those of Closures, Absences and deactivated Professionals, by start", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 3 });
    const [first, second, third] = professionals;
    await reserveFor(businessId, first, AT_1000, "Ana");
    await reserveFor(businessId, second, AT_0900, "Bruno");
    await reserveFor(businessId, third, THURSDAY_AT_0900, "Carla");
    await reserveFor(businessId, third, AT_0900, "Dario");

    await addAbsence(
      businessId,
      { professionalId: first.id, startsOn: WEDNESDAY, endsOn: WEDNESDAY },
      theDayBefore,
    );
    await deactivateProfessional(businessId, second.id);
    await addClosure(businessId, THURSDAY, theDayBefore);

    expect(summary(await getConflictingReservations(businessId, theDayBefore))).toEqual([
      "Bruno deactivated",
      "Ana absence",
      "Carla closure",
    ]);
  });

  it("a Reservation with more than one reason appears once, with the one that says what to do", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 2 });
    const [first, second] = professionals;
    await reserveFor(businessId, first, AT_0900, "Ana");
    await reserveFor(businessId, second, AT_0900, "Bruno");
    await addAbsence(
      businessId,
      { professionalId: first.id, startsOn: WEDNESDAY, endsOn: WEDNESDAY },
      theDayBefore,
    );
    await addAbsence(
      businessId,
      { professionalId: second.id, startsOn: WEDNESDAY, endsOn: WEDNESDAY },
      theDayBefore,
    );
    await deactivateProfessional(businessId, second.id);
    await addClosure(businessId, WEDNESDAY, theDayBefore);

    // A Closure wins over everything; a Deactivation, over an Absence.
    expect(summary(await getConflictingReservations(businessId, theDayBefore))).toEqual([
      "Ana closure",
      "Bruno closure",
    ]);
  });

  it("the Reservations of a deactivated Professional stop being so once reassigned or cancelled", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays, professionals: 3 });
    const [first, second] = professionals;
    const ana = await reserveFor(businessId, first, AT_0900, "Ana");
    const bruno = await reserveFor(businessId, first, AT_1000, "Bruno");
    await deactivateProfessional(businessId, first.id);

    await reassign(businessId, ana.id, second.id);
    await cancelByBusiness(businessId, bruno.id, theDayBefore, fakeEmailSender());

    expect(await getConflictingReservations(businessId, theDayBefore)).toEqual([]);
  });

  it("leaves out the past ones: they can no longer be served anyway", async () => {
    const { businessId, professionals } = await setUpBusiness({ openDays });
    await reserveFor(businessId, professionals[0], AT_0900, "Ana");
    await deactivateProfessional(businessId, professionals[0].id);
    const onThursday = new Date("2026-11-12T15:00:00Z");

    expect(await getConflictingReservations(businessId, onThursday)).toEqual([]);
  });

  it("does not show another Business's", async () => {
    const { businessId } = await setUpBusiness({ openDays });
    const other = await setUpBusiness({ path: "otro", openDays });
    await reserveFor(other.businessId, other.professionals[0], AT_0900, "Ana");
    await deactivateProfessional(other.businessId, other.professionals[0].id);
    await addClosure(other.businessId, WEDNESDAY, theDayBefore);

    expect(await getConflictingReservations(businessId, theDayBefore)).toEqual([]);
    expect(await getConflictingReservations(other.businessId, theDayBefore)).toHaveLength(1);
  });
});
