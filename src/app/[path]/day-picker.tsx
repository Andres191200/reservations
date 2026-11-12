"use client";

import Form from "next/form";
import styles from "./public-page.module.scss";

/**
 * Chooses the day with the phone's native date picker. Changing the date shows that day
 * right away; the button is there for browsers without JavaScript.
 */
export function DayPicker(props: {
  action: string;
  name: string;
  value: string;
  min: string;
  max: string;
}) {
  return (
    <Form action={props.action} className={styles.dayPicker}>
      <label className={styles.field}>
        <span>Día</span>
        <input
          type="date"
          name={props.name}
          defaultValue={props.value}
          key={props.value}
          min={props.min}
          max={props.max}
          required
          onChange={(event) => {
            if (event.currentTarget.value) event.currentTarget.form?.requestSubmit();
          }}
        />
      </label>
      <button type="submit" className={styles.secondaryButton}>
        Ver horarios
      </button>
    </Form>
  );
}
