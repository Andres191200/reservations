import { describe, expect, it } from "vitest";
import { validatePath } from "./path";

describe("validatePath", () => {
  it.each(["don-pepe", "barberia", "barberia-2", "123", "a"])("accepts %s", (path) => {
    expect(validatePath(path)).toEqual({ valid: true });
  });

  it.each([
    ["empty", ""],
    ["uppercase letters", "Don-Pepe"],
    ["spaces", "don pepe"],
    ["accents", "peluquería"],
    ["an underscore", "don_pepe"],
    ["a slash", "don/pepe"],
    ["a dot", "favicon.ico"],
    ["a leading hyphen", "-pepe"],
    ["a trailing hyphen", "pepe-"],
    ["consecutive hyphens", "don--pepe"],
    ["more than 63 characters", "a".repeat(64)],
  ])("rejects a path with %s", (_case, path) => {
    expect(validatePath(path)).toMatchObject({ valid: false });
  });

  it.each(["admin", "api", "reserva"])("rejects the reserved word %s", (path) => {
    expect(validatePath(path)).toEqual({
      valid: false,
      reason: expect.stringContaining("reservada"),
    });
  });
});
