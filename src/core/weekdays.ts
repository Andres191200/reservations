/** ISO weekdays (1 = Monday ... 7 = Sunday) with the names users read. */
export const WEEKDAYS = [
  { weekday: 1, name: "Lunes" },
  { weekday: 2, name: "Martes" },
  { weekday: 3, name: "Miércoles" },
  { weekday: 4, name: "Jueves" },
  { weekday: 5, name: "Viernes" },
  { weekday: 6, name: "Sábado" },
  { weekday: 7, name: "Domingo" },
] as const;

export function weekdayName(weekday: number): string {
  return WEEKDAYS.find((day) => day.weekday === weekday)?.name ?? `Día ${weekday}`;
}
