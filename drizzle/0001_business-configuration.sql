CREATE TABLE "opening_hours" (
	"business_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL,
	CONSTRAINT "opening_hours_business_id_weekday_pk" PRIMARY KEY("business_id","weekday"),
	CONSTRAINT "opening_hours_weekday_range" CHECK ("opening_hours"."weekday" BETWEEN 1 AND 7),
	CONSTRAINT "opening_hours_closes_after_opens" CHECK ("opening_hours"."closes_at" > "opening_hours"."opens_at")
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "reservation_duration_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "minimum_notice_hours" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "maximum_notice_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "cancellation_deadline_hours" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;