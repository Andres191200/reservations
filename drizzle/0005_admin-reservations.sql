CREATE TYPE "public"."created_by" AS ENUM('customer', 'admin');--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "customer_email" DROP NOT NULL;--> statement-breakpoint
-- Edited by hand: every Reservation before this migration was made by a Customer from
-- the public page. The default only fills those rows and is dropped right after, so new
-- Reservations always say who created them.
ALTER TABLE "reservations" ADD COLUMN "created_by" "created_by" NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE "reservations" ALTER COLUMN "created_by" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_customer_email_required" CHECK ("reservations"."created_by" = 'admin' OR "reservations"."customer_email" IS NOT NULL);
