CREATE TABLE "program_call_stats" (
	"program_address" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"address" text NOT NULL,
	"calls_number" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "program_call_stats_program_address_address_unique" UNIQUE("program_address","address"),
	CONSTRAINT "unique_callers_per_program" UNIQUE("program_address","address")
);
--> statement-breakpoint
CREATE TABLE "program_stats" (
	"program_address" text NOT NULL,
	"calling_programs_count" integer DEFAULT 0 NOT NULL,
	"transaction_references_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "program_stats_program_address_unique" UNIQUE("program_address")
);
