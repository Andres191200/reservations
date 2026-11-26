import { describe, expect, it } from "vitest";
import type { DayAvailabilityOverview, ReservableDaysOverview } from "@/core/available-slots";
import type { CalendarDay } from "@/core/time-zone";
import { unavailableSlotNotice } from "./messages";

// Thursday 26 of November 2026 up to Saturday 26 of December.
const reservableDays = { first: "2026-11-26", last: "2026-12-26" };

/** The Reservable days of a Business, with what each day has (by default, no slots left). */
function overview(
  days: Record<CalendarDay, Omit<DayAvailabilityOverview, "durationMinutes">> = {},
): Pick<ReservableDaysOverview, "reservableDays" | "availabilityOn"> {
  return {
    reservableDays,
    availabilityOn: (day) => ({
      durationMinutes: 30,
      ...(days[day] ?? { slots: [], emptyReason: "noneLeft" }),
    }),
  };
}

describe("Why a block cannot be reserved, as the Customer is told", () => {
  it("a block of a day the Business does not open on is not available, and says why", () => {
    const notice = unavailableSlotNotice(
      "Don Pepe",
      "2026-11-28",
      overview({ "2026-11-28": { slots: [], emptyReason: "weekdayClosed" } }),
    );

    expect(notice).toEqual({
      title: "Ese horario no está disponible.",
      detail: "Don Pepe no atiende los sábados.",
    });
  });

  it("a block of a day with a Closure is not available, and says why", () => {
    const notice = unavailableSlotNotice(
      "Don Pepe",
      "2026-12-08",
      overview({ "2026-12-08": { slots: [], emptyReason: "closure" } }),
    );

    expect(notice).toEqual({
      title: "Ese horario no está disponible.",
      detail: "Don Pepe no atiende ese día.",
    });
  });

  it("a block that was reserved, or already started, is no longer available", () => {
    expect(unavailableSlotNotice("Don Pepe", "2026-11-27", overview())).toEqual({
      title: "Ese horario ya no está disponible.",
    });
    expect(
      unavailableSlotNotice(
        "Don Pepe",
        "2026-11-27",
        overview({ "2026-11-27": { slots: [{ startsAt: new Date(), time: "10:00" }] } }),
      ),
    ).toEqual({ title: "Ese horario ya no está disponible." });
  });

  it("a block of a day already past is no longer available", () => {
    expect(unavailableSlotNotice("Don Pepe", "2026-11-20", overview())).toEqual({
      title: "Ese horario ya no está disponible.",
    });
  });

  it("a block after the Maximum notice is not available yet, and says until when", () => {
    expect(unavailableSlotNotice("Don Pepe", "2027-01-15", overview())).toEqual({
      title: "Ese horario no está disponible.",
      detail: "Se puede reservar hasta el sábado 26 de diciembre.",
    });
  });

  it("a link without a valid block is not available", () => {
    expect(unavailableSlotNotice("Don Pepe", undefined, overview())).toEqual({
      title: "Ese horario no está disponible.",
    });
  });
});
