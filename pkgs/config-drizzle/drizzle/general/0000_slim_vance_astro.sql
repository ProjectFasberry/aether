-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."donation_type" AS ENUM('authentic', 'loyal', 'arkhont');--> statement-breakpoint
CREATE TYPE "public"."payment_crypto_ton_status" AS ENUM('created', 'received', 'captured', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'waitingForCapture', 'succeeded', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."player_activity_event" AS ENUM('join', 'quit');--> statement-breakpoint
CREATE TYPE "public"."store_currency" AS ENUM('CHARISM', 'BELKOIN');--> statement-breakpoint
CREATE SEQUENCE "public"."libertybans_punishment_ids" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775806 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."libertybans_victim_ids" INCREMENT BY 1 MINVALUE -2147483648 MAXVALUE 2147483647 START WITH -2147483648 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."libertybans_track_ids" INCREMENT BY 1 MINVALUE -2147483648 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "public"."libertybans_scope_ids" INCREMENT BY 1 MINVALUE -2147483648 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "AUTH" (
	"NICKNAME" varchar(255) NOT NULL,
	"LOWERCASENICKNAME" varchar(255) PRIMARY KEY NOT NULL,
	"HASH" varchar(255) NOT NULL,
	"IP" varchar(255),
	"TOTPTOKEN" varchar(255),
	"REGDATE" bigint,
	"UUID" varchar(255),
	"PREMIUMUUID" varchar(255),
	"LOGINIP" varchar(255),
	"LOGINDATE" bigint,
	"ISSUEDTIME" bigint
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "currencies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"imageUrl" text NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"title" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"reward" text,
	"origin" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events_original" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_original_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "facts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fact" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findout" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "findout_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SOCIAL" (
	"LOWERCASENICKNAME" varchar(255) PRIMARY KEY NOT NULL,
	"VK_ID" bigint,
	"TELEGRAM_ID" bigint,
	"DISCORD_ID" bigint,
	"BLOCKED" boolean,
	"TOTP_ENABLED" boolean,
	"NOTIFY_ENABLED" boolean
);
--> statement-breakpoint
CREATE TABLE "ip_list" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ip_list_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ip" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"description" text,
	"title" text NOT NULL,
	"image" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "likes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"initiator" text NOT NULL,
	"recipient" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modpacks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "modpacks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"imageUrl" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client" text NOT NULL,
	"mods" text NOT NULL,
	"name" text NOT NULL,
	"shaders" text,
	"version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "news_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"imageUrl" text NOT NULL,
	"content" jsonb NOT NULL,
	"creator" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "news_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"initiator" text NOT NULL,
	"news_id" integer NOT NULL,
	CONSTRAINT "news_views_news_id_initiator_uniq" UNIQUE("initiator","news_id"),
	CONSTRAINT "news_views_initiator_length" CHECK (char_length(initiator) >= 2)
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "referrals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"referrer" text NOT NULL,
	"referral" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_cart_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "store_cart_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"initiator" text NOT NULL,
	"product_id" integer NOT NULL,
	"price_snapshot" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"quantity" integer NOT NULL,
	"selected" boolean DEFAULT true NOT NULL,
	"recipient" text NOT NULL,
	CONSTRAINT "product_id_initiator" UNIQUE("initiator","product_id")
);
--> statement-breakpoint
CREATE TABLE "store_economy" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "store_economy_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	"value" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"imageUrl" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_promotion_styles" (
	"type" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_promotions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone DEFAULT now(),
	"title" text NOT NULL,
	"priority" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voted_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "voted_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stpre_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"imageUrl" text,
	"price" bigint NOT NULL,
	"type" text NOT NULL,
	"currency" "store_currency" NOT NULL,
	"value" text NOT NULL,
	"command" text,
	"content" jsonb NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"value" boolean NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"event" timestamp with time zone NOT NULL,
	"type" "player_activity_event" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fv_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fv_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"item_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "permissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "permissions_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_methods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"imageUrl" text NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners_views" (
	"banner_id" integer,
	"nickname" text NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banners_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	CONSTRAINT "banners_views_id_key" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banners_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text,
	"href_title" text NOT NULL,
	"href_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"role_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uuid" text NOT NULL,
	"premium_uuid" text,
	"lower_case_nickname" text NOT NULL,
	"nickname_tsv" "tsvector",
	CONSTRAINT "players_uuid_key" UNIQUE("uuid"),
	CONSTRAINT "players_lowercasenickname_key" UNIQUE("lower_case_nickname"),
	CONSTRAINT "players_lower_case_nickname_key" UNIQUE("lower_case_nickname")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text NOT NULL,
	"reward_value" integer NOT NULL,
	"reward_currency" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires" timestamp with time zone,
	"action_type" text NOT NULL,
	"action_value" text
);
--> statement-breakpoint
CREATE TABLE "admin_activity_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_activity_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"initiator" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privated_chat" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "privated_chat_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"nickname" text NOT NULL,
	"message" text NOT NULL,
	"edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dictionaries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dictionaries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chat_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"message_id" integer NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_views_constraint_1" UNIQUE("message_id","nickname")
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content" jsonb NOT NULL,
	"category" text NOT NULL,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rules_category_key" UNIQUE("category")
);
--> statement-breakpoint
CREATE TABLE "wiki_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wiki_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wiki_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone,
	"category_title" text NOT NULL,
	"group_id" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "wiki_category_key" UNIQUE("category")
);
--> statement-breakpoint
CREATE TABLE "players_socials" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "players_socials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"social" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_keys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"nickname" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments_game_childs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payments_game_childs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"store_item_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipient" text NOT NULL,
	"order_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tg_logs_chats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tg_logs_chats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"chat_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players_socials_available" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "players_socials_available_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"value" text NOT NULL,
	"isAvailable" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" integer NOT NULL,
	"order_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "payment_status" NOT NULL,
	"payload" text NOT NULL,
	"price" text NOT NULL,
	"invoice_id" integer NOT NULL,
	"unique_id" text NOT NULL,
	"pay_url" text NOT NULL,
	"asset" text NOT NULL,
	"initiator" text NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "payments_game" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "te_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"unique_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"initiator" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_backgrounds" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "library_backgrounds_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "servers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fullname" text NOT NULL,
	"available" boolean DEFAULT false NOT NULL,
	"excluded" boolean DEFAULT false NOT NULL,
	"description" text,
	"thumbnail" text NOT NULL,
	"origin" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_perms_constraint_1" PRIMARY KEY("permission_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "players_permissions" (
	"nickname" text NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "players_permissions_constraint_3" PRIMARY KEY("nickname","permission_id")
);
--> statement-breakpoint
CREATE TABLE "activity_heatmap" (
	"date" date NOT NULL,
	"hour" integer NOT NULL,
	"active_players" integer NOT NULL,
	CONSTRAINT "constraint_1" PRIMARY KEY("date","hour")
);
--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_constraint_key_2" FOREIGN KEY ("referrer") REFERENCES "public"."players"("nickname") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_constraint_key_3" FOREIGN KEY ("referral") REFERENCES "public"."players"("nickname") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "banners_views" ADD CONSTRAINT "banners_views_constraint_1" FOREIGN KEY ("banner_id") REFERENCES "public"."banners"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "banners_views" ADD CONSTRAINT "banners_views_constraint_2" FOREIGN KEY ("nickname") REFERENCES "public"."players"("nickname") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "constraint_1" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_perms_constraint_2" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_perms_constraint_3" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "players_permissions" ADD CONSTRAINT "players_permissions_constraint_1" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "players_permissions" ADD CONSTRAINT "players_permissions_constraint_2" FOREIGN KEY ("nickname") REFERENCES "public"."players"("nickname") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "AUTH_IP_idx" ON "AUTH" USING btree ("IP" text_ops);--> statement-breakpoint
CREATE INDEX "AUTH_PREMIUMUUID_idx" ON "AUTH" USING btree ("PREMIUMUUID" text_ops);--> statement-breakpoint
CREATE INDEX "items_title_trgm" ON "store_items" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_players_lower_case_nickname" ON "players" USING btree ("lower_case_nickname" text_ops);--> statement-breakpoint
CREATE INDEX "idx_players_nickname_tsv" ON "players" USING gin ("nickname_tsv" tsvector_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_players_uuid" ON "players" USING btree ("uuid" text_ops);
*/