import { describe, expect, it } from "vitest";
import { buscarNegocioPorPath, crearNegocio } from "./negocios";

// Test modelo: corre contra el Postgres real (base `reservas_test`), que se vacía
// antes de cada test. Los tests nuevos siguen esta forma: llaman a la misma función
// que usa la app y verifican lo que se puede observar desde afuera.
describe("Negocios", () => {
  it("un Negocio creado se encuentra por su path", async () => {
    await crearNegocio({ nombre: "Barbería Don Pepe", path: "don-pepe" });

    const negocio = await buscarNegocioPorPath("don-pepe");

    expect(negocio).toMatchObject({ nombre: "Barbería Don Pepe", path: "don-pepe" });
  });
});
