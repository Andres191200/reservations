// Esquema de la base. Cada cambio acá se convierte en migración con `npm run db:generate`.
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Id de un Negocio. Es un string, pero con su propio tipo: así el compilador no deja
 * pasar por error el id de otra cosa (una Reserva, un Profesional) donde va un Negocio.
 */
export type NegocioId = string & { readonly __negocioId: unique symbol };

/** Negocio: la unidad de aislamiento de datos (el tenant). */
export const negocios = pgTable("negocios", {
  id: uuid().$type<NegocioId>().primaryKey().defaultRandom(),
  nombre: text().notNull(),
  /** Segmento de la URL de su página pública: app.com/<path>. */
  path: text().notNull().unique(),
  creadoEn: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// --- Tablas de Better Auth ---------------------------------------------------------
// Las columnas usan los nombres que espera Better Auth (name, createdAt, ...); solo
// las tablas tienen nombre en castellano (ver `modelName` en src/lib/auth.ts).

/** Administrador: la cuenta de acceso al panel. Cada Negocio tiene exactamente uno. */
export const administradores = pgTable("administradores", {
  id: uuid().primaryKey().defaultRandom(),
  negocioId: uuid()
    .$type<NegocioId>()
    .notNull()
    .unique()
    .references(() => negocios.id, { onDelete: "cascade" }),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Sesión iniciada de un Administrador. El token viaja en una cookie httpOnly. */
export const sesiones = pgTable("sesiones", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => administradores.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Credencial de un Administrador. Con email y contraseña, guarda el hash en `password`. */
export const cuentas = pgTable("cuentas", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => administradores.id, { onDelete: "cascade" }),
  accountId: text().notNull(),
  providerId: text().notNull(),
  password: text(),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp({ withTimezone: true }),
  refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  scope: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Tokens de verificación de Better Auth (no se usan en el MVP, pero los exige). */
export const verificaciones = pgTable("verificaciones", {
  id: uuid().primaryKey().defaultRandom(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
