CREATE TABLE "absences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "absences_ends_on_or_after_starts" CHECK ("absences"."ends_on" >= "absences"."starts_on")
);
--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absences" ADD CONSTRAINT "absences_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "absences_business_id_ends_on_idx" ON "absences" USING btree ("business_id","ends_on");