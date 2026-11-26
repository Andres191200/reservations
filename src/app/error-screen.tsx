"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { MessageScreen } from "./message-screen";
import styles from "./message-screen.module.scss";

/**
 * What a person sees when a page fails: a clear message in Spanish and a way out, never
 * the technical details. The server already logged (and reported) its own errors, which
 * arrive here with a `digest`; errors of the browser are logged and reported here.
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
    const fromServer = typeof error === "object" && error !== null && "digest" in error;
    if (!fromServer) Sentry.captureException(error);
  }, [error]);

  return (
    <MessageScreen title={title} message={message} alert>
      {retry && (
        <button type="button" className={styles.primaryAction} onClick={() => retry()}>
          Reintentar
        </button>
      )}
      {home && (
        <Link href={home.href} className={styles.secondaryAction}>
          {home.label}
        </Link>
      )}
    </MessageScreen>
  );
}
