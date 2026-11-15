"use client";

import Form from "next/form";
import styles from "../admin.module.scss";

/**
 * Chooses the day to show with the native date picker. Changing the date shows that day
 * right away; the button is there for browsers without JavaScript. `keep` are other query
 * parameters that must survive the change (e.g. the Professional of the Agenda).
 */
export function DayPicker(props: {
  action: string;
  name: string;
  value: string;
  keep?: Record<string, string>;
}) {
  return (
    <Form action={props.action} className={styles.dayPicker}>
      {Object.entries(props.keep ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label className={styles.field}>
        <span>Día</span>
        <input
          type="date"
          name={props.name}
          defaultValue={props.value}
          key={props.value}
          required
          onChange={(event) => {
            if (event.currentTarget.value) event.currentTarget.form?.requestSubmit();
          }}
        />
      </label>
      <button type="submit" className={styles.secondaryButton}>
        Ver día
      </button>
    </Form>
  );
}
