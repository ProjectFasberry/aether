-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `plan_access_log` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`time` bigint(20) NOT NULL,
	`from_ip` varchar(45) DEFAULT 'NULL',
	`request_method` varchar(8) NOT NULL,
	`request_uri` text NOT NULL,
	`response_code` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `plan_allowlist_bounce` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`name` varchar(36) NOT NULL,
	`server_id` int(11) NOT NULL,
	`times` int(11) NOT NULL DEFAULT 0,
	`last_bounce` bigint(20) NOT NULL,
	CONSTRAINT `uuid` UNIQUE(`uuid`)
);
--> statement-breakpoint
CREATE TABLE `plan_cookies` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`web_username` varchar(100) NOT NULL,
	`expires` bigint(20) NOT NULL,
	`cookie` varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_extension_groups` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`group_name` varchar(50) DEFAULT 'NULL',
	`provider_id` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_extension_icons` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '''question''',
	`family` varchar(15) NOT NULL DEFAULT '''SOLID''',
	`color` varchar(25) NOT NULL DEFAULT '''NONE'''
);
--> statement-breakpoint
CREATE TABLE `plan_extension_plugins` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`last_updated` bigint(20) NOT NULL,
	`server_uuid` varchar(36) NOT NULL,
	`icon_id` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_extension_providers` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`text` varchar(50) NOT NULL,
	`description` varchar(150) DEFAULT 'NULL',
	`priority` int(11) NOT NULL DEFAULT 0,
	`show_in_players_table` tinyint(1) NOT NULL DEFAULT 0,
	`groupable` tinyint(1) NOT NULL DEFAULT 0,
	`condition_name` varchar(54) DEFAULT 'NULL',
	`provided_condition` varchar(50) DEFAULT 'NULL',
	`format_type` varchar(25) DEFAULT 'NULL',
	`hidden` tinyint(1) NOT NULL DEFAULT 0,
	`player_name` tinyint(1) NOT NULL DEFAULT 0,
	`plugin_id` int(11) NOT NULL,
	`icon_id` int(11) NOT NULL,
	`tab_id` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `plan_extension_server_table_values` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`table_row` int(11) NOT NULL DEFAULT 0,
	`col_1_value` varchar(250) DEFAULT 'NULL',
	`col_2_value` varchar(250) DEFAULT 'NULL',
	`col_3_value` varchar(250) DEFAULT 'NULL',
	`col_4_value` varchar(250) DEFAULT 'NULL',
	`col_5_value` varchar(250) DEFAULT 'NULL',
	`table_id` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_extension_server_values` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`boolean_value` tinyint(1) DEFAULT 'NULL',
	`double_value` double DEFAULT 'NULL',
	`percentage_value` double DEFAULT 'NULL',
	`long_value` bigint(20) DEFAULT 'NULL',
	`string_value` varchar(250) DEFAULT 'NULL',
	`component_value` varchar(500) DEFAULT 'NULL',
	`group_value` varchar(50) DEFAULT 'NULL',
	`provider_id` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_extension_tables` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(25) NOT NULL DEFAULT '''NONE''',
	`values_for` int(11) DEFAULT 0,
	`condition_name` varchar(54) DEFAULT 'NULL',
	`col_1_name` varchar(50) DEFAULT 'NULL',
	`col_2_name` varchar(50) DEFAULT 'NULL',
	`col_3_name` varchar(50) DEFAULT 'NULL',
	`col_4_name` varchar(50) DEFAULT 'NULL',
	`col_5_name` varchar(50) DEFAULT 'NULL',
	`plugin_id` int(11) NOT NULL,
	`icon_1_id` int(11) DEFAULT 'NULL',
	`icon_2_id` int(11) DEFAULT 'NULL',
	`icon_3_id` int(11) DEFAULT 'NULL',
	`icon_4_id` int(11) DEFAULT 'NULL',
	`icon_5_id` int(11) DEFAULT 'NULL',
	`format_1` varchar(15) DEFAULT 'NULL',
	`format_2` varchar(15) DEFAULT 'NULL',
	`format_3` varchar(15) DEFAULT 'NULL',
	`format_4` varchar(15) DEFAULT 'NULL',
	`format_5` varchar(15) DEFAULT 'NULL',
	`tab_id` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `plan_extension_tabs` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`element_order` varchar(100) NOT NULL DEFAULT '''VALUES,GRAPH,TABLE''',
	`tab_priority` int(11) NOT NULL,
	`plugin_id` int(11) NOT NULL,
	`icon_id` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_extension_user_table_values` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`table_row` int(11) NOT NULL DEFAULT 0,
	`col_1_value` varchar(250) DEFAULT 'NULL',
	`col_2_value` varchar(250) DEFAULT 'NULL',
	`col_3_value` varchar(250) DEFAULT 'NULL',
	`col_4_value` varchar(250) DEFAULT 'NULL',
	`table_id` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_extension_user_values` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`boolean_value` tinyint(1) DEFAULT 'NULL',
	`double_value` double DEFAULT 'NULL',
	`percentage_value` double DEFAULT 'NULL',
	`long_value` bigint(20) DEFAULT 'NULL',
	`string_value` varchar(250) DEFAULT 'NULL',
	`component_value` varchar(500) DEFAULT 'NULL',
	`group_value` varchar(50) DEFAULT 'NULL',
	`uuid` varchar(36) NOT NULL,
	`provider_id` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_geolocations` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`geolocation` varchar(50) NOT NULL,
	`last_used` bigint(20) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `plan_join_address` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`join_address` varchar(191) DEFAULT 'NULL',
	CONSTRAINT `join_address` UNIQUE(`join_address`)
);
--> statement-breakpoint
CREATE TABLE `plan_kills` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`killer_uuid` varchar(36) NOT NULL,
	`victim_uuid` varchar(36) NOT NULL,
	`server_uuid` varchar(36) NOT NULL,
	`weapon` varchar(30) NOT NULL,
	`date` bigint(20) NOT NULL,
	`session_id` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_nicknames` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`nickname` varchar(75) NOT NULL,
	`server_uuid` varchar(36) NOT NULL,
	`last_used` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_ping` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`server_id` int(11) NOT NULL,
	`date` bigint(20) NOT NULL,
	`max_ping` int(11) NOT NULL,
	`min_ping` int(11) NOT NULL,
	`avg_ping` double NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_plugin_versions` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`server_id` int(11) NOT NULL,
	`plugin_name` varchar(100) NOT NULL,
	`version` varchar(255) DEFAULT 'NULL',
	`modified` bigint(20) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `plan_security` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`username` varchar(100) NOT NULL,
	`linked_to_uuid` varchar(36) DEFAULT '''''',
	`salted_pass_hash` varchar(100) NOT NULL,
	`group_id` int(11) NOT NULL,
	CONSTRAINT `username` UNIQUE(`username`),
	CONSTRAINT `salted_pass_hash` UNIQUE(`salted_pass_hash`)
);
--> statement-breakpoint
CREATE TABLE `plan_servers` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`name` varchar(100) DEFAULT 'NULL',
	`web_address` varchar(100) DEFAULT 'NULL',
	`is_installed` tinyint(1) NOT NULL DEFAULT 1,
	`is_proxy` tinyint(1) NOT NULL DEFAULT 0,
	`plan_version` varchar(18) DEFAULT 'NULL',
	CONSTRAINT `uuid` UNIQUE(`uuid`)
);
--> statement-breakpoint
CREATE TABLE `plan_sessions` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`server_id` int(11) NOT NULL,
	`session_start` bigint(20) NOT NULL,
	`session_end` bigint(20) NOT NULL,
	`mob_kills` int(11) NOT NULL,
	`deaths` int(11) NOT NULL,
	`afk_time` bigint(20) NOT NULL,
	`join_address_id` int(11) NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `plan_settings` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`server_uuid` varchar(39) NOT NULL,
	`updated` bigint(20) NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT `server_uuid` UNIQUE(`server_uuid`)
);
--> statement-breakpoint
CREATE TABLE `plan_tps` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`server_id` int(11) NOT NULL,
	`date` bigint(20) NOT NULL,
	`tps` double NOT NULL,
	`players_online` int(11) NOT NULL,
	`cpu_usage` double NOT NULL,
	`ram_usage` bigint(20) NOT NULL,
	`entities` int(11) NOT NULL,
	`chunks_loaded` int(11) NOT NULL,
	`free_disk_space` bigint(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_users` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`registered` bigint(20) NOT NULL,
	`name` varchar(36) NOT NULL,
	`times_kicked` int(11) NOT NULL DEFAULT 0,
	CONSTRAINT `uuid` UNIQUE(`uuid`)
);
--> statement-breakpoint
CREATE TABLE `plan_user_info` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`server_id` int(11) NOT NULL,
	`join_address` varchar(191) DEFAULT 'NULL',
	`registered` bigint(20) NOT NULL,
	`opped` tinyint(1) NOT NULL DEFAULT 0,
	`banned` tinyint(1) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `plan_web_group` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`group_name` varchar(100) NOT NULL,
	CONSTRAINT `group_name` UNIQUE(`group_name`)
);
--> statement-breakpoint
CREATE TABLE `plan_web_group_to_permission` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`group_id` int(11) NOT NULL,
	`permission_id` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_web_permission` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`permission` varchar(100) NOT NULL,
	CONSTRAINT `permission` UNIQUE(`permission`)
);
--> statement-breakpoint
CREATE TABLE `plan_web_user_preferences` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`preferences` text NOT NULL,
	`web_user_id` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `plan_worlds` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`world_name` varchar(100) NOT NULL,
	`server_uuid` varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_world_times` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`world_id` int(11) NOT NULL,
	`server_id` int(11) NOT NULL,
	`session_id` int(11) NOT NULL,
	`survival_time` bigint(20) NOT NULL DEFAULT 0,
	`creative_time` bigint(20) NOT NULL DEFAULT 0,
	`adventure_time` bigint(20) NOT NULL DEFAULT 0,
	`spectator_time` bigint(20) NOT NULL DEFAULT 0
);
--> statement-breakpoint
ALTER TABLE `plan_allowlist_bounce` ADD CONSTRAINT `plan_allowlist_bounce_ibfk_1` FOREIGN KEY (`server_id`) REFERENCES `plan_servers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_groups` ADD CONSTRAINT `plan_extension_groups_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `plan_extension_providers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_plugins` ADD CONSTRAINT `plan_extension_plugins_ibfk_1` FOREIGN KEY (`icon_id`) REFERENCES `plan_extension_icons`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_providers` ADD CONSTRAINT `plan_extension_providers_ibfk_1` FOREIGN KEY (`plugin_id`) REFERENCES `plan_extension_plugins`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_providers` ADD CONSTRAINT `plan_extension_providers_ibfk_2` FOREIGN KEY (`icon_id`) REFERENCES `plan_extension_icons`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_providers` ADD CONSTRAINT `plan_extension_providers_ibfk_3` FOREIGN KEY (`tab_id`) REFERENCES `plan_extension_tabs`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_server_table_values` ADD CONSTRAINT `plan_extension_server_table_values_ibfk_1` FOREIGN KEY (`table_id`) REFERENCES `plan_extension_tables`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_server_values` ADD CONSTRAINT `plan_extension_server_values_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `plan_extension_providers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_tables` ADD CONSTRAINT `plan_extension_tables_ibfk_1` FOREIGN KEY (`plugin_id`) REFERENCES `plan_extension_plugins`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_tables` ADD CONSTRAINT `plan_extension_tables_ibfk_2` FOREIGN KEY (`icon_1_id`) REFERENCES `plan_extension_icons`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_tables` ADD CONSTRAINT `plan_extension_tables_ibfk_3` FOREIGN KEY (`icon_2_id`) REFERENCES `plan_extension_icons`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_tables` ADD CONSTRAINT `plan_extension_tables_ibfk_4` FOREIGN KEY (`icon_3_id`) REFERENCES `plan_extension_icons`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_tables` ADD CONSTRAINT `plan_extension_tables_ibfk_5` FOREIGN KEY (`icon_4_id`) REFERENCES `plan_extension_icons`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_tables` ADD CONSTRAINT `plan_extension_tables_ibfk_6` FOREIGN KEY (`icon_5_id`) REFERENCES `plan_extension_icons`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_tables` ADD CONSTRAINT `plan_extension_tables_ibfk_7` FOREIGN KEY (`tab_id`) REFERENCES `plan_extension_tabs`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_tabs` ADD CONSTRAINT `plan_extension_tabs_ibfk_1` FOREIGN KEY (`plugin_id`) REFERENCES `plan_extension_plugins`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_tabs` ADD CONSTRAINT `plan_extension_tabs_ibfk_2` FOREIGN KEY (`icon_id`) REFERENCES `plan_extension_icons`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_user_table_values` ADD CONSTRAINT `plan_extension_user_table_values_ibfk_1` FOREIGN KEY (`table_id`) REFERENCES `plan_extension_tables`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_extension_user_values` ADD CONSTRAINT `plan_extension_user_values_ibfk_1` FOREIGN KEY (`provider_id`) REFERENCES `plan_extension_providers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_geolocations` ADD CONSTRAINT `plan_geolocations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `plan_users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_kills` ADD CONSTRAINT `plan_kills_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `plan_sessions`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_ping` ADD CONSTRAINT `plan_ping_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `plan_users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_ping` ADD CONSTRAINT `plan_ping_ibfk_2` FOREIGN KEY (`server_id`) REFERENCES `plan_servers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_plugin_versions` ADD CONSTRAINT `plan_plugin_versions_ibfk_1` FOREIGN KEY (`server_id`) REFERENCES `plan_servers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_security` ADD CONSTRAINT `plan_security_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `plan_web_group`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_sessions` ADD CONSTRAINT `plan_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `plan_users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_sessions` ADD CONSTRAINT `plan_sessions_ibfk_2` FOREIGN KEY (`server_id`) REFERENCES `plan_servers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_tps` ADD CONSTRAINT `plan_tps_ibfk_1` FOREIGN KEY (`server_id`) REFERENCES `plan_servers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_user_info` ADD CONSTRAINT `plan_user_info_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `plan_users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_user_info` ADD CONSTRAINT `plan_user_info_ibfk_2` FOREIGN KEY (`server_id`) REFERENCES `plan_servers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_web_group_to_permission` ADD CONSTRAINT `plan_web_group_to_permission_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `plan_web_group`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_web_group_to_permission` ADD CONSTRAINT `plan_web_group_to_permission_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `plan_web_permission`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_web_user_preferences` ADD CONSTRAINT `plan_web_user_preferences_ibfk_1` FOREIGN KEY (`web_user_id`) REFERENCES `plan_security`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_world_times` ADD CONSTRAINT `plan_world_times_ibfk_1` FOREIGN KEY (`world_id`) REFERENCES `plan_worlds`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_world_times` ADD CONSTRAINT `plan_world_times_ibfk_2` FOREIGN KEY (`session_id`) REFERENCES `plan_sessions`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_world_times` ADD CONSTRAINT `plan_world_times_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `plan_users`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `plan_world_times` ADD CONSTRAINT `plan_world_times_ibfk_4` FOREIGN KEY (`server_id`) REFERENCES `plan_servers`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `server_id` ON `plan_allowlist_bounce` (`server_id`);--> statement-breakpoint
CREATE INDEX `provider_id` ON `plan_extension_groups` (`provider_id`);--> statement-breakpoint
CREATE INDEX `icon_id` ON `plan_extension_plugins` (`icon_id`);--> statement-breakpoint
CREATE INDEX `plugin_id` ON `plan_extension_providers` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `icon_id` ON `plan_extension_providers` (`icon_id`);--> statement-breakpoint
CREATE INDEX `tab_id` ON `plan_extension_providers` (`tab_id`);--> statement-breakpoint
CREATE INDEX `table_id` ON `plan_extension_server_table_values` (`table_id`);--> statement-breakpoint
CREATE INDEX `provider_id` ON `plan_extension_server_values` (`provider_id`);--> statement-breakpoint
CREATE INDEX `plugin_id` ON `plan_extension_tables` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `icon_1_id` ON `plan_extension_tables` (`icon_1_id`);--> statement-breakpoint
CREATE INDEX `icon_2_id` ON `plan_extension_tables` (`icon_2_id`);--> statement-breakpoint
CREATE INDEX `icon_3_id` ON `plan_extension_tables` (`icon_3_id`);--> statement-breakpoint
CREATE INDEX `icon_4_id` ON `plan_extension_tables` (`icon_4_id`);--> statement-breakpoint
CREATE INDEX `icon_5_id` ON `plan_extension_tables` (`icon_5_id`);--> statement-breakpoint
CREATE INDEX `tab_id` ON `plan_extension_tables` (`tab_id`);--> statement-breakpoint
CREATE INDEX `plugin_id` ON `plan_extension_tabs` (`plugin_id`);--> statement-breakpoint
CREATE INDEX `icon_id` ON `plan_extension_tabs` (`icon_id`);--> statement-breakpoint
CREATE INDEX `table_id` ON `plan_extension_user_table_values` (`table_id`);--> statement-breakpoint
CREATE INDEX `provider_id` ON `plan_extension_user_values` (`provider_id`);--> statement-breakpoint
CREATE INDEX `user_id` ON `plan_geolocations` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_id` ON `plan_kills` (`session_id`);--> statement-breakpoint
CREATE INDEX `plan_kills_uuid_index` ON `plan_kills` (`killer_uuid`,`victim_uuid`,`server_uuid`);--> statement-breakpoint
CREATE INDEX `plan_kills_date_index` ON `plan_kills` (`date`);--> statement-breakpoint
CREATE INDEX `user_id` ON `plan_ping` (`user_id`);--> statement-breakpoint
CREATE INDEX `server_id` ON `plan_ping` (`server_id`);--> statement-breakpoint
CREATE INDEX `plan_ping_date_index` ON `plan_ping` (`date`);--> statement-breakpoint
CREATE INDEX `server_id` ON `plan_plugin_versions` (`server_id`);--> statement-breakpoint
CREATE INDEX `group_id` ON `plan_security` (`group_id`);--> statement-breakpoint
CREATE INDEX `user_id` ON `plan_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `server_id` ON `plan_sessions` (`server_id`);--> statement-breakpoint
CREATE INDEX `plan_sessions_date_index` ON `plan_sessions` (`session_start`);--> statement-breakpoint
CREATE INDEX `plan_session_join_address_index` ON `plan_sessions` (`join_address_id`);--> statement-breakpoint
CREATE INDEX `server_id` ON `plan_tps` (`server_id`);--> statement-breakpoint
CREATE INDEX `plan_tps_date_index` ON `plan_tps` (`date`);--> statement-breakpoint
CREATE INDEX `plan_users_uuid_index` ON `plan_users` (`uuid`);--> statement-breakpoint
CREATE INDEX `user_id` ON `plan_user_info` (`user_id`);--> statement-breakpoint
CREATE INDEX `server_id` ON `plan_user_info` (`server_id`);--> statement-breakpoint
CREATE INDEX `group_id` ON `plan_web_group_to_permission` (`group_id`);--> statement-breakpoint
CREATE INDEX `permission_id` ON `plan_web_group_to_permission` (`permission_id`);--> statement-breakpoint
CREATE INDEX `web_user_id` ON `plan_web_user_preferences` (`web_user_id`);--> statement-breakpoint
CREATE INDEX `world_id` ON `plan_world_times` (`world_id`);--> statement-breakpoint
CREATE INDEX `session_id` ON `plan_world_times` (`session_id`);--> statement-breakpoint
CREATE INDEX `user_id` ON `plan_world_times` (`user_id`);--> statement-breakpoint
CREATE INDEX `server_id` ON `plan_world_times` (`server_id`);
*/