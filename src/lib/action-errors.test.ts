import { notFound, redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { UNEXPECTED_ERROR, withUnexpectedErrors } from "./action-errors";

describe("Unexpected errors in actions", () => {
  it("returns what the action returns", async () => {
    expect(await withUnexpectedErrors(async () => ({ error: "Completá tu nombre." }))).toEqual({
      error: "Completá tu nombre.",
    });
  });

  it("turns an unexpected failure into a message without details, and logs the error", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error('relation "reservations" does not exist');

    const state = await withUnexpectedErrors<{ error?: string; name?: string }>(
      async () => {
        throw failure;
      },
      { name: "Ana" },
    );

    expect(state).toEqual({ error: UNEXPECTED_ERROR, name: "Ana" });
    expect(UNEXPECTED_ERROR).not.toContain("reservations");
    expect(logError).toHaveBeenCalledWith("Error inesperado en una acción:", failure);
    logError.mockRestore();
  });

  it.each([
    ["redirect", () => redirect("/admin/login")],
    ["notFound", () => notFound()],
  ])("lets Next.js's %s through", async (_case, signal) => {
    await expect(
      withUnexpectedErrors(async () => {
        signal();
        return {};
      }),
    ).rejects.toThrow();
  });
});
