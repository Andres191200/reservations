import type { Email, EmailSender } from "@/core/email";

/**
 * Stands in for the real EmailSender in tests: records what would have been sent, or,
 * with `failing`, fails every send the way a provider outage would.
 */
export function fakeEmailSender(options: { failing?: boolean } = {}) {
  const sent: Email[] = [];
  const sender: EmailSender = {
    async send(email) {
      if (options.failing) throw new Error("Fallo simulado del proveedor de email");
      sent.push(email);
    },
  };
  return { ...sender, sent };
}
