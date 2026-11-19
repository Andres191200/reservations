"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./error-screen.module.scss";

/**
 * What a person sees when a page fails: a clear message in Spanish and a way out, never
 * the technical details. The server already logged its own errors; errors of the browser
 * are logged here.
 */
export function ErrorScreen({
  error,
  retry,
  title,
  message,
  home,
}: {
  error: unknown;
  retry?: () => void;
  title: string;
  message: string;
  /** A link out of the error, e.g. to the panel's home. */
  home?: { href: string; label: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className={styles.screen} role="alert">
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {retry && (
          <button type="button" className={styles.retry} onClick={() => retry()}>
            Reintentar
          </button>
        )}
        {home && (
          <Link href={home.href} className={styles.home}>
            {home.label}
          </Link>
        )}
      </div>
    </section>
  );
}
