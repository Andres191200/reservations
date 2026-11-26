"use client";

import Form from "next/form";
import { useEffect, useRef } from "react";
import styles from "./public-page.module.scss";

/**
 * Chooses the day with the native date picker. A day chosen in the picker is shown right
 * away; a typed one, when leaving the field or with Enter, so typing "2" does not jump to
 * the 2nd. Without JavaScript, the "Ver horarios" button sends the form.
 */
export function DayPicker(props: {
  action: string;
  name: string;
  value: string;
  min: string;
  max: string;
}) {
  // The last key went to the field: the change comes from typing, not from the picker.
  const typing = useRef(false);
  // The day already asked for, so leaving the field right after does not ask again. It
  // follows the day shown, which also changes with "Día anterior" and "Día siguiente".
  const requested = useRef(props.value);
  useEffect(() => {
    requested.current = props.value;
  }, [props.value]);

  function show(input: HTMLInputElement) {
    // Out of range, sending shows the browser's message instead of the day.
    if (!input.value || input.value === requested.current) return;
    requested.current = input.value;
    input.form?.requestSubmit();
  }

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
          onKeyDown={(event) => {
            typing.current = event.key !== "Enter";
            // Enter sends the form by itself (it has a single field).
            if (event.key === "Enter") requested.current = event.currentTarget.value;
          }}
          onPointerDown={() => {
            typing.current = false;
          }}
          onChange={(event) => {
            if (!typing.current) show(event.currentTarget);
          }}
          onBlur={(event) => show(event.currentTarget)}
        />
      </label>
      <noscript>
        <button type="submit" className={styles.secondaryButton}>
          Ver horarios
        </button>
      </noscript>
    </Form>
  );
}
