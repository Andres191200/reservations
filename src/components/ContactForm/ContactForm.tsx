"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { contactSchema, type ContactInput } from "@/schemas/contact";
import styles from "./ContactForm.module.scss";

type FieldErrors = Partial<Record<keyof ContactInput, string[]>>;
type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const result = contactSchema.safeParse(Object.fromEntries(new FormData(form)));

    if (!result.success) {
      setErrors(z.flattenError(result.error).fieldErrors);
      return;
    }

    setErrors({});
    setStatus("sending");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
    });

    if (res.ok) {
      setStatus("sent");
      form.reset();
    } else {
      setStatus("error");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Field name="name" label="Nombre" errors={errors.name} />
      <Field name="email" label="Email" type="email" errors={errors.email} />
      <Field name="message" label="Mensaje" multiline errors={errors.message} />

      <button className={styles.button} type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : "Enviar"}
      </button>

      {status === "sent" && <p className={styles.success}>¡Mensaje enviado!</p>}
      {status === "error" && <p className={styles.error}>Algo salió mal.</p>}
    </form>
  );
}

type FieldProps = {
  name: keyof ContactInput;
  label: string;
  type?: string;
  multiline?: boolean;
  errors?: string[];
};

function Field({ name, label, type = "text", multiline, errors }: FieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const shared = {
    id,
    name,
    className: styles.input,
    "aria-invalid": Boolean(errors?.length),
    "aria-describedby": errors?.length ? errorId : undefined,
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea rows={4} {...shared} /> : <input type={type} {...shared} />}
      {errors?.length ? (
        <p id={errorId} className={styles.error}>
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}
