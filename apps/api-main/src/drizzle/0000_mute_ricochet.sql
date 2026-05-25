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
	"ISSUEDTIME" bigint,
	CONSTRAINT "AUTH_NICKNAME_not_null" CHECK (NOT NULL "NICKNAME"),
	CONSTRAINT "AUTH_LOWERCASENICKNAME_not_null" CHECK (NOT NULL "LOWERCASENICKNAME"),
	CONSTRAINT "AUTH_HASH_not_null" CHECK (NOT NULL "HASH")
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "currencies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"imageUrl" text NOT NULL,
	"isPublic" boolean DEFAULT true NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL,
	"title" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "currencies_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "currencies_imageUrl_not_null" CHECK (NOT NULL "imageUrl"),
	CONSTRAINT "currencies_isPublic_not_null" CHECK (NOT NULL "isPublic"),
	CONSTRAINT "currencies_isAvailable_not_null" CHECK (NOT NULL "isAvailable"),
	CONSTRAINT "currencies_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "currencies_value_not_null" CHECK (NOT NULL value)
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"reward" text,
	"origin" text NOT NULL,
	CONSTRAINT "events_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "events_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "events_description_not_null" CHECK (NOT NULL description),
	CONSTRAINT "events_origin_not_null" CHECK (NOT NULL origin)
);
--> statement-breakpoint
CREATE TABLE "events_original" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "events_original_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	CONSTRAINT "events_original_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "events_original_type_not_null" CHECK (NOT NULL type)
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "facts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fact" text NOT NULL,
	CONSTRAINT "facts_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "facts_fact_not_null" CHECK (NOT NULL fact)
);
--> statement-breakpoint
CREATE TABLE "findout" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "findout_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "findout_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "findout_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "findout_value_not_null" CHECK (NOT NULL value)
);
--> statement-breakpoint
CREATE TABLE "SOCIAL" (
	"LOWERCASENICKNAME" varchar(255) PRIMARY KEY NOT NULL,
	"VK_ID" bigint,
	"TELEGRAM_ID" bigint,
	"DISCORD_ID" bigint,
	"BLOCKED" boolean,
	"TOTP_ENABLED" boolean,
	"NOTIFY_ENABLED" boolean,
	CONSTRAINT "SOCIAL_LOWERCASENICKNAME_not_null" CHECK (NOT NULL "LOWERCASENICKNAME")
);
--> statement-breakpoint
CREATE TABLE "ip_list" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ip_list_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ip" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "ip_list_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "ip_list_ip_not_null" CHECK (NOT NULL ip),
	CONSTRAINT "ip_list_name_not_null" CHECK (NOT NULL name)
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"description" text,
	"title" text NOT NULL,
	"image" text NOT NULL,
	CONSTRAINT "items_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "items_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "items_image_not_null" CHECK (NOT NULL image)
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "likes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"initiator" text NOT NULL,
	"recipient" text NOT NULL,
	CONSTRAINT "likes_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "likes_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "likes_initiator_not_null" CHECK (NOT NULL initiator),
	CONSTRAINT "likes_recipient_not_null" CHECK (NOT NULL recipient)
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
	"version" text NOT NULL,
	CONSTRAINT "modpacks_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "modpacks_imageUrl_not_null" CHECK (NOT NULL "imageUrl"),
	CONSTRAINT "modpacks_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "modpacks_client_not_null" CHECK (NOT NULL client),
	CONSTRAINT "modpacks_mods_not_null" CHECK (NOT NULL mods),
	CONSTRAINT "modpacks_name_not_null" CHECK (NOT NULL name),
	CONSTRAINT "modpacks_version_not_null" CHECK (NOT NULL version)
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "news_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"imageUrl" text NOT NULL,
	"content" jsonb NOT NULL,
	"creator" text NOT NULL,
	CONSTRAINT "news_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "news_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "news_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "news_description_not_null" CHECK (NOT NULL description),
	CONSTRAINT "news_imageUrl_not_null" CHECK (NOT NULL "imageUrl"),
	CONSTRAINT "news_creator_not_null" CHECK (NOT NULL creator),
	CONSTRAINT "news_content_not_null" CHECK (NOT NULL content)
);
--> statement-breakpoint
CREATE TABLE "news_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "news_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"initiator" text NOT NULL,
	"news_id" integer NOT NULL,
	CONSTRAINT "news_views_news_id_initiator_uniq" UNIQUE("initiator","news_id"),
	CONSTRAINT "news_views_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "news_views_initiator_not_null" CHECK (NOT NULL initiator),
	CONSTRAINT "news_views_news_id_not_null" CHECK (NOT NULL news_id),
	CONSTRAINT "news_views_initiator_length" CHECK (char_length(initiator) >= 2)
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "referrals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"referrer" text NOT NULL,
	"referral" text NOT NULL,
	CONSTRAINT "referrals_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "referrals_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "referrals_completed_not_null" CHECK (NOT NULL completed),
	CONSTRAINT "referrals_initiator_not_null" CHECK (NOT NULL referrer),
	CONSTRAINT "referrals_recipient_not_null" CHECK (NOT NULL referral)
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
	CONSTRAINT "product_id_initiator" UNIQUE("initiator","product_id"),
	CONSTRAINT "store_cart_items_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "store_cart_items_initiator_not_null" CHECK (NOT NULL initiator),
	CONSTRAINT "store_cart_items_product_id_not_null" CHECK (NOT NULL product_id),
	CONSTRAINT "store_cart_items_price_snapshot_not_null" CHECK (NOT NULL price_snapshot),
	CONSTRAINT "store_cart_items_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "store_cart_items_quantity_not_null" CHECK (NOT NULL quantity),
	CONSTRAINT "store_cart_items_selected_not_null" CHECK (NOT NULL selected),
	CONSTRAINT "store_cart_items_recipient_not_null" CHECK (NOT NULL recipient)
);
--> statement-breakpoint
CREATE TABLE "store_economy" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "store_economy_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type" text NOT NULL,
	"value" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"imageUrl" text NOT NULL,
	CONSTRAINT "store_economy_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "store_economy_type_not_null" CHECK (NOT NULL type),
	CONSTRAINT "store_economy_value_not_null" CHECK (NOT NULL value),
	CONSTRAINT "store_economy_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "store_economy_description_not_null" CHECK (NOT NULL description),
	CONSTRAINT "store_economy_imageUrl_not_null" CHECK (NOT NULL "imageUrl")
);
--> statement-breakpoint
CREATE TABLE "store_promotion_styles" (
	"type" text NOT NULL,
	"color" text NOT NULL,
	"icon" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "store_promotion_styles_type_not_null" CHECK (NOT NULL type),
	CONSTRAINT "store_promotion_styles_color_not_null" CHECK (NOT NULL color),
	CONSTRAINT "store_promotion_styles_icon_not_null" CHECK (NOT NULL icon),
	CONSTRAINT "store_promotion_styles_label_not_null" CHECK (NOT NULL label)
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
	"priority" text NOT NULL,
	CONSTRAINT "store_promotions_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "store_promotions_item_id_not_null" CHECK (NOT NULL item_id),
	CONSTRAINT "store_promotions_type_not_null" CHECK (NOT NULL type),
	CONSTRAINT "store_promotions_value_not_null" CHECK (NOT NULL value),
	CONSTRAINT "store_promotions_starts_at_not_null" CHECK (NOT NULL starts_at),
	CONSTRAINT "store_promotions_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "store_promotions_priority_not_null" CHECK (NOT NULL priority)
);
--> statement-breakpoint
CREATE TABLE "voted_users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "voted_users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voted_users_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "voted_users_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "voted_users_created_at_not_null" CHECK (NOT NULL created_at)
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
	"description" text,
	CONSTRAINT "store_items_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "store_items_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "store_items_price_not_null" CHECK (NOT NULL price),
	CONSTRAINT "store_items_type_not_null" CHECK (NOT NULL type),
	CONSTRAINT "store_items_value_not_null" CHECK (NOT NULL value),
	CONSTRAINT "store_items_currency_not_null" CHECK (NOT NULL currency),
	CONSTRAINT "store_items_content_not_null" CHECK (NOT NULL content)
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"value" boolean NOT NULL,
	"title" text NOT NULL,
	CONSTRAINT "options_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "options_name_not_null" CHECK (NOT NULL name),
	CONSTRAINT "options_value_not_null" CHECK (NOT NULL value),
	CONSTRAINT "options_title_not_null" CHECK (NOT NULL title)
);
--> statement-breakpoint
CREATE TABLE "activity_users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"event" timestamp with time zone NOT NULL,
	"type" "player_activity_event" NOT NULL,
	CONSTRAINT "activity_users_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "activity_users_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "activity_users_type_not_null" CHECK (NOT NULL type),
	CONSTRAINT "activity_users_event_not_null" CHECK (NOT NULL event)
);
--> statement-breakpoint
CREATE TABLE "fv_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fv_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"item_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fv_items_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "fv_items_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "fv_items_item_id_not_null" CHECK (NOT NULL item_id),
	CONSTRAINT "fv_items_created_at_not_null" CHECK (NOT NULL created_at)
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT "roles_name_not_null" CHECK (NOT NULL name),
	CONSTRAINT "roles_id_not_null" CHECK (NOT NULL id)
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "permissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	CONSTRAINT "permissions_name_key" UNIQUE("name"),
	CONSTRAINT "permissions_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "permissions_name_not_null" CHECK (NOT NULL name)
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_methods_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"imageUrl" text NOT NULL,
	"isAvailable" boolean DEFAULT true NOT NULL,
	CONSTRAINT "payment_methods_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "payment_methods_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "payment_methods_value_not_null" CHECK (NOT NULL value),
	CONSTRAINT "payment_methods_imageUrl_not_null" CHECK (NOT NULL "imageUrl"),
	CONSTRAINT "payment_methods_isAvailable_not_null" CHECK (NOT NULL "isAvailable")
);
--> statement-breakpoint
CREATE TABLE "banners_views" (
	"banner_id" integer,
	"nickname" text NOT NULL,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banners_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	CONSTRAINT "banners_views_id_key" UNIQUE("id"),
	CONSTRAINT "banners_views_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "banners_views_id_not_null" CHECK (NOT NULL id)
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "banners_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text,
	"href_title" text NOT NULL,
	"href_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banners_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "banners_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "banners_href_title_not_null" CHECK (NOT NULL href_title),
	CONSTRAINT "banners_href_value_not_null" CHECK (NOT NULL href_value),
	CONSTRAINT "banners_created_at_not_null" CHECK (NOT NULL created_at)
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
	CONSTRAINT "players_lower_case_nickname_key" UNIQUE("lower_case_nickname"),
	CONSTRAINT "users_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "users_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "users_role_id_not_null" CHECK (NOT NULL role_id),
	CONSTRAINT "players_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "players_uuid_not_null" CHECK (NOT NULL uuid),
	CONSTRAINT "players_lowercasenickname_not_null" CHECK (NOT NULL lower_case_nickname)
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
	"action_value" text,
	CONSTRAINT "tasks_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "tasks_title_not_null" CHECK (NOT NULL title),
	CONSTRAINT "tasks_description_not_null" CHECK (NOT NULL description),
	CONSTRAINT "tasks_reward_value_not_null" CHECK (NOT NULL reward_value),
	CONSTRAINT "tasks_reward_currency_not_null" CHECK (NOT NULL reward_currency),
	CONSTRAINT "tasks_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "tasks_action_type_not_null" CHECK (NOT NULL action_type)
);
--> statement-breakpoint
CREATE TABLE "admin_activity_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_activity_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"initiator" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event" text NOT NULL,
	CONSTRAINT "admin_activity_log_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "admin_activity_log_initiator_not_null" CHECK (NOT NULL initiator),
	CONSTRAINT "admin_activity_log_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "admin_activity_log_event_not_null" CHECK (NOT NULL event)
);
--> statement-breakpoint
CREATE TABLE "privated_chat" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "privated_chat_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"nickname" text NOT NULL,
	"message" text NOT NULL,
	"edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone,
	CONSTRAINT "privated_chat_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "privated_chat_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "privated_chat_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "privated_chat_message_not_null" CHECK (NOT NULL message),
	CONSTRAINT "privated_chat_edited_not_null" CHECK (NOT NULL edited)
);
--> statement-breakpoint
CREATE TABLE "dictionaries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dictionaries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dictionaries_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "dictionaries_key_not_null" CHECK (NOT NULL key),
	CONSTRAINT "dictionaries_value_not_null" CHECK (NOT NULL value),
	CONSTRAINT "dictionaries_created_at_not_null" CHECK (NOT NULL created_at)
);
--> statement-breakpoint
CREATE TABLE "chat_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chat_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"message_id" integer NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_views_constraint_1" UNIQUE("message_id","nickname"),
	CONSTRAINT "chat_views_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "chat_views_message_id_not_null" CHECK (NOT NULL message_id),
	CONSTRAINT "chat_views_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "chat_views_created_at_not_null" CHECK (NOT NULL created_at)
);
--> statement-breakpoint
CREATE TABLE "rules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"content" jsonb NOT NULL,
	"category" text NOT NULL,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rules_category_key" UNIQUE("category"),
	CONSTRAINT "rules_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "rules_content_not_null" CHECK (NOT NULL content),
	CONSTRAINT "rules_category_not_null" CHECK (NOT NULL category),
	CONSTRAINT "rules_created_at_not_null" CHECK (NOT NULL created_at)
);
--> statement-breakpoint
CREATE TABLE "wiki_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wiki_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"title" text NOT NULL,
	CONSTRAINT "wiki_groups_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "wiki_groups_name_not_null" CHECK (NOT NULL name),
	CONSTRAINT "wiki_groups_title_not_null" CHECK (NOT NULL title)
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
	CONSTRAINT "wiki_category_key" UNIQUE("category"),
	CONSTRAINT "wiki_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "wiki_category_not_null" CHECK (NOT NULL category),
	CONSTRAINT "wiki_content_not_null" CHECK (NOT NULL content),
	CONSTRAINT "wiki_category_title_not_null" CHECK (NOT NULL category_title),
	CONSTRAINT "wiki_group_id_not_null" CHECK (NOT NULL group_id)
);
--> statement-breakpoint
CREATE TABLE "players_socials" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "players_socials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nickname" text NOT NULL,
	"social" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_socials_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "players_socials_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "players_socials_social_not_null" CHECK (NOT NULL social),
	CONSTRAINT "players_socials_value_not_null" CHECK (NOT NULL value),
	CONSTRAINT "players_socials_created_at_not_null" CHECK (NOT NULL created_at)
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_keys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"nickname" text NOT NULL,
	CONSTRAINT "api_keys_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "api_keys_key_not_null" CHECK (NOT NULL key),
	CONSTRAINT "api_keys_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "api_keys_nickname_not_null" CHECK (NOT NULL nickname)
);
--> statement-breakpoint
CREATE TABLE "payments_game_childs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payments_game_childs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"store_item_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipient" text NOT NULL,
	"order_id" text NOT NULL,
	CONSTRAINT "payments_game_childs_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "payments_game_childs_store_item_id_not_null" CHECK (NOT NULL store_item_id),
	CONSTRAINT "payments_game_childs_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "payments_game_childs_recipient_not_null" CHECK (NOT NULL recipient),
	CONSTRAINT "payments_game_childs_order_id_not_null" CHECK (NOT NULL order_id)
);
--> statement-breakpoint
CREATE TABLE "tg_logs_chats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tg_logs_chats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"chat_id" text NOT NULL,
	CONSTRAINT "tg_logs_chats_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "tg_logs_chats_chat_id_not_null" CHECK (NOT NULL chat_id)
);
--> statement-breakpoint
CREATE TABLE "players_socials_available" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "players_socials_available_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"value" text NOT NULL,
	"isAvailable" boolean DEFAULT true,
	CONSTRAINT "players_socials_available_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "players_socials_available_value_not_null" CHECK (NOT NULL value)
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
	"comment" text,
	CONSTRAINT "payments_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "payments_order_id_not_null" CHECK (NOT NULL order_id),
	CONSTRAINT "payments_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "payments_status_not_null" CHECK (NOT NULL status),
	CONSTRAINT "payments_payload_not_null" CHECK (NOT NULL payload),
	CONSTRAINT "payments_price_not_null" CHECK (NOT NULL price),
	CONSTRAINT "payments_invoice_id_not_null" CHECK (NOT NULL invoice_id),
	CONSTRAINT "payments_unique_id_not_null" CHECK (NOT NULL unique_id),
	CONSTRAINT "payments_pay_url_not_null" CHECK (NOT NULL pay_url),
	CONSTRAINT "payments_asset_not_null" CHECK (NOT NULL asset),
	CONSTRAINT "payments_initiator_not_null" CHECK (NOT NULL initiator)
);
--> statement-breakpoint
CREATE TABLE "payments_game" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "te_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"unique_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"initiator" text NOT NULL,
	CONSTRAINT "te_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "te_unique_id_not_null" CHECK (NOT NULL unique_id),
	CONSTRAINT "te_created_at_not_null" CHECK (NOT NULL created_at),
	CONSTRAINT "payments_game_initiator_not_null" CHECK (NOT NULL initiator)
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "servers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"fullname" text NOT NULL,
	"available" boolean DEFAULT false NOT NULL,
	"excluded" boolean DEFAULT false NOT NULL,
	"description" text,
	"thumbnail" text NOT NULL,
	"origin" text NOT NULL,
	CONSTRAINT "servers_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "servers_fullname_not_null" CHECK (NOT NULL fullname),
	CONSTRAINT "servers_available_not_null" CHECK (NOT NULL available),
	CONSTRAINT "servers_excluded_not_null" CHECK (NOT NULL excluded),
	CONSTRAINT "servers_thumbnail_not_null" CHECK (NOT NULL thumbnail),
	CONSTRAINT "servers_origin_not_null" CHECK (NOT NULL origin)
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_perms_constraint_1" PRIMARY KEY("permission_id","role_id"),
	CONSTRAINT "role_permissions_role_id_not_null" CHECK (NOT NULL role_id),
	CONSTRAINT "role_permissions_permission_id_not_null" CHECK (NOT NULL permission_id)
);
--> statement-breakpoint
CREATE TABLE "players_permissions" (
	"nickname" text NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "players_permissions_constraint_3" PRIMARY KEY("nickname","permission_id"),
	CONSTRAINT "players_permissions_nickname_not_null" CHECK (NOT NULL nickname),
	CONSTRAINT "players_permissions_permission_id_not_null" CHECK (NOT NULL permission_id)
);
--> statement-breakpoint
CREATE TABLE "activity_heatmap" (
	"date" date NOT NULL,
	"hour" integer NOT NULL,
	"active_players" integer NOT NULL,
	CONSTRAINT "constraint_1" PRIMARY KEY("date","hour"),
	CONSTRAINT "activity_heatmap_date_not_null" CHECK (NOT NULL date),
	CONSTRAINT "activity_heatmap_hour_not_null" CHECK (NOT NULL hour),
	CONSTRAINT "activity_heatmap_active_players_not_null" CHECK (NOT NULL active_players)
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