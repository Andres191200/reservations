CREATE TYPE "public"."cancelled_by" AS ENUM('customer', 'business');--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "cancelled_by" "cancelled_by";--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_cancellation_recorded" CHECK (("reservations"."status" = 'cancelled') = ("reservations"."cancelled_by" IS NOT NULL AND "reservations"."cancelled_at" IS NOT NULL));