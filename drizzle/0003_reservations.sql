CREATE TYPE "public"."reservation_status" AS ENUM('confirmed', 'cancelled');--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'confirmed' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"cancellation_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_cancellationToken_unique" UNIQUE("cancellation_token"),
	CONSTRAINT "reservations_ends_after_starts" CHECK ("reservations"."ends_at" > "reservations"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reservations_business_id_starts_at_idx" ON "reservations" USING btree ("business_id","starts_at");--> statement-breakpoint
-- Written by hand: Drizzle cannot express exclusion constraints.
-- btree_gist lets a GiST index compare uuids with `=`, next to the time range.
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
-- Two Confirmed Reservations of the same Professional cannot overlap. The range is
-- [starts_at, ends_at), so back-to-back Reservations do not collide. Cancelled
-- Reservations are left out, so their time can be reserved again.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_overlap" EXCLUDE USING gist (
	"professional_id" WITH =,
	tstzrange("starts_at", "ends_at") WITH &&
) WHERE ("status" = 'confirmed');
