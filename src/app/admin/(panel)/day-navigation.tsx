import Link from "next/link";
import { capitalize, formatDay } from "@/core/format";
import { addDays, type CalendarDay } from "@/core/time-zone";
import styles from "../admin.module.scss";
import { DAY_PARAM, panelHref } from "./day";
import { DayPicker } from "./day-picker";

/**
 * The day a panel page shows, with links to the previous and next days, back to today,
 * and a date picker to jump to any day. `keep` are the other query parameters of the page.
 */
export function DayNavigation({
  route,
  day,
  today,
  keep = {},
}: {
  route: string;
  day: CalendarDay;
  today: CalendarDay;
  keep?: Record<string, string>;
}) {
  const hrefOf = (target: CalendarDay) => panelHref(route, { ...keep, [DAY_PARAM]: target });

  return (
    <div className={styles.dayNavigation}>
      <h2>
        {capitalize(formatDay(day))}
        {day === today && <span className={styles.muted}> · hoy</span>}
      </h2>
      <nav className={styles.dayLinks} aria-label="Cambiar de día">
        <Link href={hrefOf(addDays(day, -1))}>← Día anterior</Link>
        {day !== today && <Link href={hrefOf(today)}>Hoy</Link>}
        <Link href={hrefOf(addDays(day, 1))}>Día siguiente →</Link>
      </nav>
      <DayPicker action={route} name={DAY_PARAM} value={day} keep={keep} />
    </div>
  );
}
