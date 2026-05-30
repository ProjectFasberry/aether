-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "luckperms_user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(36) NOT NULL,
	"permission" varchar(200) NOT NULL,
	"value" boolean NOT NULL,
	"server" varchar(36) NOT NULL,
	"world" varchar(64) NOT NULL,
	"expiry" bigint NOT NULL,
	"contexts" varchar(200) NOT NULL,
	CONSTRAINT "unique_uuid_permission" UNIQUE("uuid","permission")
);
--> statement-breakpoint
CREATE TABLE "luckperms_group_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(36) NOT NULL,
	"permission" varchar(200) NOT NULL,
	"value" boolean NOT NULL,
	"server" varchar(36) NOT NULL,
	"world" varchar(64) NOT NULL,
	"expiry" bigint NOT NULL,
	"contexts" varchar(200) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "luckperms_groups" (
	"name" varchar(36) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "luckperms_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"time" bigint NOT NULL,
	"actor_uuid" varchar(36) NOT NULL,
	"actor_name" varchar(100) NOT NULL,
	"type" char(1) NOT NULL,
	"acted_uuid" varchar(36) NOT NULL,
	"acted_name" varchar(36) NOT NULL,
	"action" varchar(300) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "luckperms_tracks" (
	"name" varchar(36) PRIMARY KEY NOT NULL,
	"groups" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "luckperms_players" (
	"uuid" varchar(36) PRIMARY KEY NOT NULL,
	"username" varchar(16) NOT NULL,
	"primary_group" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "luckperms_user_permissions_uuid" ON "luckperms_user_permissions" USING btree ("uuid" text_ops);--> statement-breakpoint
CREATE INDEX "luckperms_group_permissions_name" ON "luckperms_group_permissions" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "luckperms_players_username" ON "luckperms_players" USING btree ("username" text_ops);
*/