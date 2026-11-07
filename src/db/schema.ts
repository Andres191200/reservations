// Esquema de la base. Cada cambio acá se convierte en migración con `npm run db:generate`.
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Negocio: la unidad de aislamiento de datos (el tenant). */
export const negocios = pgTable("negocios", {
  id: uuid().primaryKey().defaultRandom(),
  nombre: text().notNull(),
  /** Segmento de la URL de su página pública: app.com/<path>. */
  path: text().notNull().unique(),
  creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
