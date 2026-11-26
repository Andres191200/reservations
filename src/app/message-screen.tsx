import type { ReactNode } from "react";
import styles from "./message-screen.module.scss";

/**
 * A page whose only content is a message: an error, or something that is not there. It
 * says what happened and what to do, and offers the ways out (`children`), styled with
 * `primaryAction` or `secondaryAction` of message-screen.module.scss.
 */
export function MessageScreen({
  title,
  message,
  alert = false,
  children,
}: {
  title: string;
  message: string;
  /** Announced as soon as it appears: for errors. */
  alert?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={styles.screen} role={alert ? "alert" : undefined}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </section>
  );
}
