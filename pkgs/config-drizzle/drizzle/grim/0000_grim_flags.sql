CREATE TABLE IF NOT EXISTS "grim_flags" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" uuid NOT NULL,
	"nickname" text NOT NULL,
	"check_name" text NOT NULL,
	"violations" integer DEFAULT 0 NOT NULL,
	"setback_vl" real DEFAULT 0 NOT NULL,
	"server" text NOT NULL,
	"suppressed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grim_flags_created_at_idx" ON "grim_flags" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grim_flags_nickname_idx" ON "grim_flags" ("nickname", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grim_flags_check_idx" ON "grim_flags" ("check_name", "created_at" DESC);
