/** An email the platform sends. Its texts are in Spanish: the Customer reads them. */
export type Email = {
  to: string;
  /** Shown as the sender's name, next to the platform's address. */
  fromName: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Sending emails. The core receives it from outside, like the clock, so tests can replace
 * it with a fake. `send` throws if the email could not be sent.
 */
export type EmailSender = {
  send(email: Email): Promise<void>;
};

/**
 * Sends an email that must never undo what already happened (a Reservation created, a
 * Cancellation made): if building or sending it fails, the error is only logged, with
 * `failureMessage`. There are no retries.
 */
export async function sendWithoutFailing(
  emailSender: EmailSender,
  buildEmail: () => Promise<Email>,
  failureMessage: string,
): Promise<void> {
  try {
    await emailSender.send(await buildEmail());
  } catch (error) {
    console.error(failureMessage, error);
  }
}
