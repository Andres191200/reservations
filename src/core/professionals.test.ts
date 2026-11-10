import { describe, expect, it } from "vitest";
import { registerBusiness } from "./businesses";
import { addProfessional, deactivateProfessional, getActiveProfessionals } from "./professionals";

// Runs against the real Postgres (`reservas_test` database), emptied before each test.

async function register(path = "don-pepe") {
  const result = await registerBusiness({ name: path, path, adminEmail: `admin@${path}.com` });
  if (!result.ok) throw new Error(result.error);
  return result.value.business.id;
}

async function add(businessId: Awaited<ReturnType<typeof register>>, name: string) {
  const result = await addProfessional(businessId, { name });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const names = (professionals: { name: string }[]) => professionals.map((p) => p.name);

describe("A new Business", () => {
  it("starts without Professionals", async () => {
    const businessId = await register();

    expect(await getActiveProfessionals(businessId)).toEqual([]);
  });
});

describe("Adding a Professional", () => {
  it("adds it to the list of active Professionals, sorted by name", async () => {
    const businessId = await register();

    const result = await addProfessional(businessId, { name: "Martín" });
    await add(businessId, "Carla");

    expect(result).toEqual({ ok: true, value: { id: expect.any(String), name: "Martín" } });
    expect(names(await getActiveProfessionals(businessId))).toEqual(["Carla", "Martín"]);
  });

  it("trims the spaces around the name", async () => {
    const businessId = await register();

    await add(businessId, "  Lucía Gómez ");

    expect(names(await getActiveProfessionals(businessId))).toEqual(["Lucía Gómez"]);
  });

  it.each([
    ["an empty name", ""],
    ["a name with only spaces", "   "],
  ])("rejects %s", async (_case, name) => {
    const businessId = await register();

    const result = await addProfessional(businessId, { name });

    expect(result).toEqual({ ok: false, error: "El nombre del Profesional no puede estar vacío." });
    expect(await getActiveProfessionals(businessId)).toEqual([]);
  });

  it("rejects a name that is too long", async () => {
    const businessId = await register();

    expect((await addProfessional(businessId, { name: "a".repeat(101) })).ok).toBe(false);
    expect(await getActiveProfessionals(businessId)).toEqual([]);
  });

  it("rejects the name of another active Professional, ignoring case and accents", async () => {
    const businessId = await register();
    await add(businessId, "Martín");

    const result = await addProfessional(businessId, { name: "martin" });

    expect(result).toEqual({ ok: false, error: "Ya hay un Profesional activo llamado martin." });
    expect(names(await getActiveProfessionals(businessId))).toEqual(["Martín"]);
  });

  it("accepts the name of a deactivated Professional", async () => {
    const businessId = await register();
    const old = await add(businessId, "Martín");
    await deactivateProfessional(businessId, old.id);

    const result = await addProfessional(businessId, { name: "Martín" });

    expect(result.ok).toBe(true);
    expect(await getActiveProfessionals(businessId)).toEqual([
      { id: expect.not.stringMatching(old.id), name: "Martín" },
    ]);
  });
});

describe("Deactivation", () => {
  it("removes the Professional from the active list and keeps the others", async () => {
    const businessId = await register();
    const carla = await add(businessId, "Carla");
    await add(businessId, "Martín");

    const result = await deactivateProfessional(businessId, carla.id);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(names(await getActiveProfessionals(businessId))).toEqual(["Martín"]);
  });

  it("rejects a Professional that is already deactivated", async () => {
    const businessId = await register();
    const carla = await add(businessId, "Carla");
    await deactivateProfessional(businessId, carla.id);

    expect(await deactivateProfessional(businessId, carla.id)).toEqual({
      ok: false,
      error: "Ese Profesional no existe o ya está dado de baja.",
    });
  });

  it.each([
    ["an id that is not a uuid", "no-es-un-id"],
    ["an unknown id", "00000000-0000-4000-8000-000000000000"],
  ])("rejects %s", async (_case, id) => {
    const businessId = await register();
    await add(businessId, "Carla");

    expect((await deactivateProfessional(businessId, id)).ok).toBe(false);
    expect(names(await getActiveProfessionals(businessId))).toEqual(["Carla"]);
  });
});

describe("Isolation between Businesses", () => {
  it("a Business only sees its own Professionals", async () => {
    const a = await register("negocio-a");
    const b = await register("negocio-b");

    await add(a, "Carla");
    await add(b, "Martín");

    expect(names(await getActiveProfessionals(a))).toEqual(["Carla"]);
    expect(names(await getActiveProfessionals(b))).toEqual(["Martín"]);
  });

  it("a Business cannot deactivate another Business's Professional", async () => {
    const a = await register("negocio-a");
    const b = await register("negocio-b");
    const martin = await add(b, "Martín");

    const result = await deactivateProfessional(a, martin.id);

    expect(result).toEqual({
      ok: false,
      error: "Ese Profesional no existe o ya está dado de baja.",
    });
    expect(names(await getActiveProfessionals(b))).toEqual(["Martín"]);
  });

  it("the same name can be used in two Businesses", async () => {
    const a = await register("negocio-a");
    const b = await register("negocio-b");
    await add(a, "Carla");

    expect((await addProfessional(b, { name: "Carla" })).ok).toBe(true);
  });
});
