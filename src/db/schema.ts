// Database schema. Every change here becomes a migration with `npm run db:generate`.
// Names follow the English terms in GLOSSARY.md (see ADR 0002).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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
  /**
   * Reservation duration. A single value for now; issue #18 turns it into a value
   * with the date it takes effect from.
   */
  /** Reservation duration until its first change (see `reservationDurationChanges`). */
  reservationDurationMinutes: integer().notNull().default(30),
  minimumNoticeHours: integer().notNull().default(1),
  maximumNoticeDays: integer().notNull().default(30),
  cancellationDeadlineHours: integer().notNull().default(2),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Opening hours: one row per weekday the Business is open. A day without a row is closed.
 * Times are wall-clock times in Argentina (see src/core/time-zone.ts), not UTC.
 */
export const openingHours = pgTable(
  "opening_hours",
  {
    businessId: uuid()
      .$type<BusinessId>()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** ISO weekday: 1 = Monday ... 7 = Sunday. */
    weekday: smallint().notNull(),
    opensAt: time().notNull(),
    closesAt: time().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.weekday] }),
    check("opening_hours_weekday_range", sql`${table.weekday} BETWEEN 1 AND 7`),
    check("opening_hours_closes_after_opens", sql`${table.closesAt} > ${table.opensAt}`),
  ],
);

/**
 * Changes of the Reservation duration, each with the day from which it applies. A day
 * uses the last change that started on or before it; before the first change, the
 * Business's `reservationDurationMinutes`. Existing Reservations keep their start and end.
 */
export const reservationDurationChanges = pgTable(
  "reservation_duration_changes",
  {
    businessId: uuid()
      .$type<BusinessId>()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** "YYYY-MM-DD": first day, in Argentina, that uses `minutes`. */
    effectiveFrom: date({ mode: "string" }).notNull(),
    minutes: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.businessId, table.effectiveFrom] }),
    check("reservation_duration_changes_minutes_range", sql`${table.minutes} BETWEEN 5 AND 720`),
  ],
);

/** Id of a Closure, with its own type for the same reason as `BusinessId`. */
export type ClosureId = string & { readonly __closureId: unique symbol };

/**
 * Closure: a specific day the Business does not open even though its Opening hours say
 * otherwise (a holiday). The day is a calendar day in Argentina, not an instant.
 */
export const closures = pgTable(
  "closures",
  {
    id: uuid().$type<ClosureId>().primaryKey().defaultRandom(),
    businessId: uuid()
      .$type<BusinessId>()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** "YYYY-MM-DD". */
    day: date({ mode: "string" }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("closures_business_id_day_unique").on(table.businessId, table.day)],
);

/** Id of a Professional, with its own type for the same reason as `BusinessId`. */
export type ProfessionalId = string & { readonly __professionalId: unique symbol };

/**
 * Professional: a person of the Business who serves the Customers. It is never deleted:
 * a Deactivation sets `deactivatedAt`, so the history of Reservations it served is kept.
 */
export const professionals = pgTable(
  "professionals",
  {
    id: uuid().$type<ProfessionalId>().primaryKey().defaultRandom(),
    businessId: uuid()
      .$type<BusinessId>()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** When it was deactivated. Null while it is active. */
    deactivatedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("professionals_business_id_idx").on(table.businessId),
    check("professionals_name_not_blank", sql`btrim(${table.name}) <> ''`),
  ],
);

/** Id of an Absence, with its own type for the same reason as `BusinessId`. */
export type AbsenceId = string & { readonly __absenceId: unique symbol };

/**
 * Absence: whole days, from `startsOn` to `endsOn` (both included), in which a
 * Professional does not serve. Days are calendar days in Argentina, not instants.
 */
export const absences = pgTable(
  "absences",
  {
    id: uuid().$type<AbsenceId>().primaryKey().defaultRandom(),
    businessId: uuid()
      .$type<BusinessId>()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    professionalId: uuid()
      .$type<ProfessionalId>()
      .notNull()
      .references(() => professionals.id),
    /** "YYYY-MM-DD". */
    startsOn: date({ mode: "string" }).notNull(),
    /** "YYYY-MM-DD", included. */
    endsOn: date({ mode: "string" }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("absences_business_id_ends_on_idx").on(table.businessId, table.endsOn),
    check("absences_ends_on_or_after_starts", sql`${table.endsOn} >= ${table.startsOn}`),
  ],
);

/** Id of a Reservation, with its own type for the same reason as `BusinessId`. */
export type ReservationId = string & { readonly __reservationId: unique symbol };

/**
 * Reservation status. An enum and not a boolean, so more statuses can be added later.
 * A Reservation is born Confirmed.
 */
export const reservationStatus = pgEnum("reservation_status", ["confirmed", "cancelled"]);

export type ReservationStatus = (typeof reservationStatus.enumValues)[number];

/** Who made the Cancellation of a Reservation: the Customer or the Business. */
export const cancelledBy = pgEnum("cancelled_by", ["customer", "business"]);

export type CancelledBy = (typeof cancelledBy.enumValues)[number];

/**
 * Who created a Reservation: the Customer, from the public page, or the Admin, from the
 * panel.
 */
export const createdBy = pgEnum("created_by", ["customer", "admin"]);

export type CreatedBy = (typeof createdBy.enumValues)[number];

/**
 * Reservation: a Customer's commitment to be served by a Professional at a given time.
 * The Customer has no account: their contact data is stored on the Reservation itself.
 * The email is mandatory when the Customer reserves, and optional when the Admin enters
 * the Reservation from the panel.
 *
 * Two Confirmed Reservations of the same Professional cannot overlap. Drizzle cannot
 * express that exclusion constraint (`reservations_no_overlap`), so it lives in the
 * migration drizzle/0003_reservations.sql.
 */
export const reservations = pgTable(
  "reservations",
  {
    id: uuid().$type<ReservationId>().primaryKey().defaultRandom(),
    businessId: uuid()
      .$type<BusinessId>()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    professionalId: uuid()
      .$type<ProfessionalId>()
      .notNull()
      .references(() => professionals.id),
    /** When it starts and ends, as instants (UTC). The range is [startsAt, endsAt). */
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    status: reservationStatus().notNull().default("confirmed"),
    customerName: text().notNull(),
    customerEmail: text(),
    customerPhone: text(),
    createdBy: createdBy().notNull(),
    /** Random, unguessable secret of the Customer's cancellation link. */
    cancellationToken: text().notNull().unique(),
    /** Cancellation: who made it and when. Both are set exactly when it is Cancelled. */
    cancelledBy: cancelledBy(),
    cancelledAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reservations_business_id_starts_at_idx").on(table.businessId, table.startsAt),
    check("reservations_ends_after_starts", sql`${table.endsAt} > ${table.startsAt}`),
    check(
      "reservations_cancellation_recorded",
      sql`(${table.status} = 'cancelled') = (${table.cancelledBy} IS NOT NULL AND ${table.cancelledAt} IS NOT NULL)`,
    ),
    check(
      "reservations_customer_email_required",
      sql`${table.createdBy} = 'admin' OR ${table.customerEmail} IS NOT NULL`,
    ),
  ],
);

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
