-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `sr_cache` (
	`name` varchar(16) NOT NULL,
	`uuid` varchar(36) DEFAULT 'NULL',
	`timestamp` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sr_cooldowns` (
	`uuid` varchar(36) NOT NULL,
	`group_name` varchar(36) NOT NULL,
	`creation_time` bigint(20) NOT NULL,
	`duration` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sr_custom_skins` (
	`name` varchar(36) NOT NULL,
	`value` text NOT NULL,
	`signature` text NOT NULL,
	`display_name` text DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `sr_players` (
	`uuid` varchar(36) NOT NULL,
	`skin_identifier` varchar(2083) DEFAULT 'NULL',
	`skin_variant` varchar(20) DEFAULT 'NULL',
	`skin_type` varchar(20) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `sr_player_favourites` (
	`uuid` varchar(36) NOT NULL,
	`timestamp` bigint(20) NOT NULL,
	`skin_identifier` varchar(2083) NOT NULL,
	`skin_variant` varchar(20) DEFAULT 'NULL',
	`skin_type` varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sr_player_history` (
	`uuid` varchar(36) NOT NULL,
	`timestamp` bigint(20) NOT NULL,
	`skin_identifier` varchar(2083) NOT NULL,
	`skin_variant` varchar(20) DEFAULT 'NULL',
	`skin_type` varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sr_player_skins` (
	`uuid` varchar(36) NOT NULL,
	`last_known_name` varchar(16) DEFAULT 'NULL',
	`value` text NOT NULL,
	`signature` text NOT NULL,
	`timestamp` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sr_url_index` (
	`url` varchar(266) NOT NULL,
	`skin_variant` varchar(20) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `sr_url_skins` (
	`url` varchar(266) NOT NULL,
	`mine_skin_id` varchar(36) DEFAULT 'NULL',
	`value` text NOT NULL,
	`signature` text NOT NULL,
	`skin_variant` varchar(20) DEFAULT 'NULL'
);

*/