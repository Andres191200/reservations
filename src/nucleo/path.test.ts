import { describe, expect, it } from "vitest";
import { validarPath } from "./path";

describe("validarPath", () => {
  it.each(["don-pepe", "barberia", "barberia-2", "123", "a"])("acepta %s", (path) => {
    expect(validarPath(path)).toEqual({ valido: true });
  });

  it.each([
    ["vacío", ""],
    ["mayúsculas", "Don-Pepe"],
    ["espacios", "don pepe"],
    ["acentos", "peluquería"],
    ["guion bajo", "don_pepe"],
    ["barra", "don/pepe"],
    ["punto", "favicon.ico"],
    ["guion al principio", "-pepe"],
    ["guion al final", "pepe-"],
    ["guiones seguidos", "don--pepe"],
    ["más de 63 caracteres", "a".repeat(64)],
  ])("rechaza un path con %s", (_caso, path) => {
    expect(validarPath(path)).toMatchObject({ valido: false });
  });

  it.each(["admin", "api", "reserva"])("rechaza la palabra reservada %s", (path) => {
    expect(validarPath(path)).toEqual({
      valido: false,
      motivo: expect.stringContaining("reservada"),
    });
  });
});
