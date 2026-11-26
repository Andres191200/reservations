import { describe, expect, it } from "vitest";
import { formatHours, formatMinutes, openingHoursLines, weekdayPlural } from "./format";

const open = (weekday: number, opensAt = "09:00", closesAt = "18:00") => ({
  weekday,
  opensAt,
  closesAt,
});

describe("Opening hours, as the Customer reads them", () => {
  it("joins consecutive weekdays with the same hours into a range", () => {
    expect(openingHoursLines([1, 2, 3, 4, 5].map((day) => open(day)))).toEqual([
      { days: "Lunes a viernes", hours: "09:00 a 18:00" },
    ]);
  });

  it("gives each different range of hours its own line, in weekday order", () => {
    expect(
      openingHoursLines([open(1), open(2), open(3), open(4), open(5), open(6, "09:00", "13:00")]),
    ).toEqual([
      { days: "Lunes a viernes", hours: "09:00 a 18:00" },
      { days: "Sábado", hours: "09:00 a 13:00" },
    ]);
  });

  it("names two consecutive weekdays with «y», and lists the ones apart", () => {
    expect(openingHoursLines([open(1), open(2), open(4), open(6), open(7)])).toEqual([
      { days: "Lunes, martes, jueves, sábado y domingo", hours: "09:00 a 18:00" },
    ]);
    expect(openingHoursLines([open(1), open(2), open(3), open(5)])).toEqual([
      { days: "Lunes a miércoles y viernes", hours: "09:00 a 18:00" },
    ]);
  });

  it("puts a weekday with other hours in the middle on its own line", () => {
    expect(
      openingHoursLines([open(1), open(2), open(3, "14:00", "20:00"), open(4), open(5)]),
    ).toEqual([
      { days: "Lunes, martes, jueves y viernes", hours: "09:00 a 18:00" },
      { days: "Miércoles", hours: "14:00 a 20:00" },
    ]);
  });

  it("has no lines when the Business has no Opening hours", () => {
    expect(openingHoursLines([])).toEqual([]);
  });
});

describe("Durations", () => {
  it("in minutes, hours, or both", () => {
    expect(formatMinutes(45)).toBe("45 minutos");
    expect(formatMinutes(60)).toBe("1 hora");
    expect(formatMinutes(90)).toBe("1 hora y 30 minutos");
    expect(formatMinutes(120)).toBe("2 horas");
    expect(formatMinutes(1)).toBe("1 minuto");
  });

  it("in hours", () => {
    expect(formatHours(1)).toBe("1 hora");
    expect(formatHours(24)).toBe("24 horas");
  });
});

describe("Weekdays in plural", () => {
  it("for «no atiende los domingos»", () => {
    expect(weekdayPlural(7)).toBe("domingos");
    expect(weekdayPlural(6)).toBe("sábados");
    expect(weekdayPlural(1)).toBe("lunes");
    expect(weekdayPlural(3)).toBe("miércoles");
  });
});
