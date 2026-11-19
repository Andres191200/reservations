import * as Sentry from "@sentry/nextjs";
import { describe, expect, it, vi } from "vitest";
import { reportError } from "./error-reporting";
import { scrubEvent, sentryOptions } from "./sentry";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

describe("Error reporting", () => {
  it("logs the error and sends it to Sentry, with the message as context", () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("Fallo simulado");

    reportError("No se pudo enviar el email:", failure);

    expect(logError).toHaveBeenCalledWith("No se pudo enviar el email:", failure);
    expect(Sentry.captureException).toHaveBeenCalledWith(failure, {
      extra: { message: "No se pudo enviar el email:" },
    });
    logError.mockRestore();
  });

  it("asks Sentry for errors only: no tracing, no replay, no personal data", () => {
    const options = sentryOptions("https://clave@o0.ingest.sentry.io/0");
    const defaults = ["BrowserTracing", "Replay", "Breadcrumbs", "GlobalHandlers"].map((name) => ({
      name,
      setupOnce() {},
    }));

    expect(options).not.toHaveProperty("tracesSampleRate");
    expect(options.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
    });
    const integrations = options.integrations as (all: typeof defaults) => typeof defaults;
    expect(integrations(defaults).map((integration) => integration.name)).toEqual([
      "Breadcrumbs",
      "GlobalHandlers",
    ]);
  });

  it("removes the parameters of a failed query, which carry personal data", () => {
    const failed =
      'Failed query: select "id" from "admins" where "admins"."email" = $1\nparams: ana@mail.com';

    const event = scrubEvent({
      type: undefined,
      message: failed,
      exception: { values: [{ type: "Error", value: failed }] },
      breadcrumbs: [
        {
          category: "console",
          message: `Error inesperado en una acción: Error: ${failed}`,
          data: { arguments: ["Error inesperado en una acción:", { message: failed }] },
        },
      ],
    });

    expect(JSON.stringify(event)).not.toContain("ana@mail.com");
    expect(event.exception?.values?.[0].value).toBe(
      'Failed query: select "id" from "admins" where "admins"."email" = $1\nparams: [omitidos]',
    );
  });
});
