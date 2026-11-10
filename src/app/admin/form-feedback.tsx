import styles from "./admin.module.scss";

/** Result of submitting a panel form: the error, or a confirmation that it was saved. */
export function FormFeedback({
  error,
  saved,
  savedMessage = "Cambios guardados.",
}: {
  error?: string;
  saved?: boolean;
  savedMessage?: string;
}) {
  if (error) {
    return (
      <p role="alert" className={styles.error}>
        {error}
      </p>
    );
  }
  if (saved) {
    return (
      <p role="status" className={styles.success}>
        {savedMessage}
      </p>
    );
  }
  return null;
}
