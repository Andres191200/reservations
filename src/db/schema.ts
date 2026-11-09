// Database schema. Every change here becomes a migration with `npm run db:generate`.
// Names follow the English terms in GLOSSARY.md (see ADR 0002).
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Id of a Business. It is a string, but with its own type: the compiler rejects passing
 * the id of something else (a Reservation, a Professional) where a Business is expected.
 */
export type BusinessId = string & { readonly __businessId: unique symbol };

/** Business: the unit of data isolation (the tenant). */
export const businesses = pgTable("businesses", {
  id: uuid().$type<BusinessId>().primaryKey().defaultRandom(),
  name: text().notNull(),
  /** URL segment of its public page: app.com/<path>. */
  path: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// --- Better Auth tables -------------------------------------------------------------
// Columns use the names Better Auth expects. The tables are renamed through
// `modelName` in src/lib/auth.ts.

/** Admin: the login to the panel. Each Business has exactly one. */
export const admins = pgTable("admins", {
  id: uuid().primaryKey().defaultRandom(),
  businessId: uuid()
    .$type<BusinessId>()
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: "cascade" }),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** A signed-in Admin session. The token travels in an httpOnly cookie. */
export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** An Admin's credential. With email and password, the hash is stored in `password`. */
export const accounts = pgTable("accounts", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
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

/** Better Auth verification tokens (unused in the MVP, but required by Better Auth). */
export const verifications = pgTable("verifications", {
  id: uuid().primaryKey().defaultRandom(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
