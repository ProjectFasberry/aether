-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `playerpoints_migrations` (
	`migration_version` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `playerpoints_points` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(36) NOT NULL,
	`points` int(11) NOT NULL,
	CONSTRAINT `uuid` UNIQUE(`uuid`)
);
--> statement-breakpoint
CREATE TABLE `playerpoints_username_cache` (
	`uuid` varchar(36) NOT NULL,
	`username` varchar(30) NOT NULL,
	CONSTRAINT `uuid` UNIQUE(`uuid`)
);
--> statement-breakpoint
CREATE INDEX `playerpoints_username_cache_uuid_index` ON `playerpoints_username_cache` (`uuid`);--> statement-breakpoint
CREATE INDEX `playerpoints_username_cache_username_index` ON `playerpoints_username_cache` (`username`);
*/