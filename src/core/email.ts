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
