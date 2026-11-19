CREATE TABLE "reservation_duration_changes" (
	"business_id" uuid NOT NULL,
	"effective_from" date NOT NULL,
	"minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_duration_changes_business_id_effective_from_pk" PRIMARY KEY("business_id","effective_from"),
	CONSTRAINT "reservation_duration_changes_minutes_range" CHECK ("reservation_duration_changes"."minutes" BETWEEN 5 AND 720)
);
--> statement-breakpoint
ALTER TABLE "reservation_duration_changes" ADD CONSTRAINT "reservation_duration_changes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;