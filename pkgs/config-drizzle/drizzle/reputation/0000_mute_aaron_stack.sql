-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `commands` (
	`id` bigint(50) DEFAULT 'NULL',
	`commandId` varchar(50) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` bigint(50) DEFAULT 'NULL',
	`favorite` bigint(50) DEFAULT 'NULL',
	`action` varchar(50) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `reputation` (
	`id` bigint(50) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(50) DEFAULT 'NULL',
	`reputation` bigint(50) DEFAULT 'NULL',
	`acceptReputation` tinyint(1) DEFAULT 'NULL'
);

*/