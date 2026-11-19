import { beforeEach, describe, expect, it, vi } from "vitest";
import { reportError } from "@/lib/error-reporting";
import { fakeEmailSender } from "@/test/fake-email-sender";
import { sendWithoutFailing, type Email } from "./email";

vi.mock("@/lib/error-reporting", () => ({ reportError: vi.fn() }));

const email: Email = {
  to: "ana@mail.com",
  fromName: "Negocio",
  subject: "Asunto",
  text: "Texto",
  html: "<p>Texto</p>",
};

describe("Sending without failing", () => {
  beforeEach(() => {
    vi.mocked(reportError).mockClear();
  });

  it("sends the email", async () => {
    const emails = fakeEmailSender();

    await sendWithoutFailing(emails, async () => email, "No se pudo enviar:");

    expect(emails.sent).toEqual([email]);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("if sending fails, does not throw: it logs and reports the error to Sentry", async () => {
    await expect(
      sendWithoutFailing(fakeEmailSender({ failing: true }), async () => email, "No se pudo enviar:"),
    ).resolves.toBeUndefined();

    expect(reportError).toHaveBeenCalledWith(
      "No se pudo enviar:",
      expect.objectContaining({ message: "Fallo simulado del proveedor de email" }),
    );
  });
});
