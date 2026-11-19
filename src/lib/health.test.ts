import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it, vi } from "vitest";
import { healthResponse } from "./health";

// Runs against the real Postgres (`reservas_test` database).

describe("Health endpoint", () => {
  it("answers OK when the database answers", async () => {
    const response = await healthResponse();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("answers an error, without details, when the database does not answer", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    // Nothing listens on that port.
    const unreachable = drizzle("postgres://reservas:reservas@localhost:5999/no_existe");

    const response = await healthResponse(unreachable);

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ status: "error" });
    expect(body).not.toMatch(/ECONNREFUSED|5999|postgres/i);
    expect(logError).toHaveBeenCalledWith(
      "Chequeo de salud: la base no responde:",
      expect.anything(),
    );
    logError.mockRestore();
    await unreachable.$client.end();
  });

  it("answers an error when the database takes too long", async () => {
    vi.useFakeTimers();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    const hanging = { execute: () => new Promise<never>(() => {}) };

    const pending = healthResponse(hanging as never);
    await vi.advanceTimersByTimeAsync(3000);
    const response = await pending;

    expect(response.status).toBe(503);
    logError.mockRestore();
    vi.useRealTimers();
  });
});
