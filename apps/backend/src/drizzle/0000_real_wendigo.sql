-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `betonquest_backpack` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`profileID` char(36) NOT NULL,
	`instruction` text NOT NULL,
	`amount` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `betonquest_global_points` (
	`category` varchar(256) NOT NULL,
	`count` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `betonquest_global_tags` (
	`tag` varchar(510) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `betonquest_journal` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`profileID` char(36) NOT NULL,
	`pointer` varchar(255) NOT NULL,
	`date` timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `betonquest_migration` (
	`namespace` varchar(63) NOT NULL,
	`migration_id` int(11) NOT NULL,
	`time` timestamp DEFAULT 'current_timestamp()'
);
--> statement-breakpoint
CREATE TABLE `betonquest_objectives` (
	`profileID` char(36) NOT NULL,
	`objective` varchar(510) NOT NULL,
	`instructions` varchar(2046) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `betonquest_player` (
	`playerID` char(36) NOT NULL,
	`active_profile` char(36) NOT NULL,
	`language` varchar(16) NOT NULL,
	`conversation` varchar(510) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `betonquest_player_profile` (
	`playerID` char(36) NOT NULL,
	`profileID` char(36) NOT NULL,
	`name` varchar(63) NOT NULL,
	CONSTRAINT `playerID` UNIQUE(`playerID`,`name`)
);
--> statement-breakpoint
CREATE TABLE `betonquest_points` (
	`profileID` char(36) NOT NULL,
	`category` varchar(255) NOT NULL,
	`count` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `betonquest_profile` (
	`profileID` char(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `betonquest_tags` (
	`profileID` char(36) NOT NULL,
	`tag` varchar(510) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ChatControl` (
	`UUID` varchar(64) NOT NULL,
	`Name` text DEFAULT 'NULL',
	`Nick` text DEFAULT 'NULL',
	`Data` longtext DEFAULT 'NULL',
	`LastModified` bigint(20) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ChatControl_Log` (
	`Id` int(11) AUTO_INCREMENT NOT NULL,
	`Server` text DEFAULT 'NULL',
	`Date` datetime DEFAULT 'NULL',
	`Type` text DEFAULT 'NULL',
	`Sender` text DEFAULT 'NULL',
	`Receiver` text DEFAULT 'NULL',
	`Content` longtext DEFAULT 'NULL',
	`ChannelName` text DEFAULT 'NULL',
	`RuleName` text DEFAULT 'NULL',
	`RuleGroupName` text DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ChatControl_Mail` (
	`UUID` varchar(64) NOT NULL,
	`Data` longtext DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `CMI_inventories` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`player_id` int(11) DEFAULT 'NULL',
	`inventories` longtext DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `CMI_playtime` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`player_id` int(11) DEFAULT 'NULL',
	`date` int(11) DEFAULT 'NULL',
	`h0` bigint(20) DEFAULT 'NULL',
	`h1` bigint(20) DEFAULT 'NULL',
	`h2` bigint(20) DEFAULT 'NULL',
	`h3` bigint(20) DEFAULT 'NULL',
	`h4` bigint(20) DEFAULT 'NULL',
	`h5` bigint(20) DEFAULT 'NULL',
	`h6` bigint(20) DEFAULT 'NULL',
	`h7` bigint(20) DEFAULT 'NULL',
	`h8` bigint(20) DEFAULT 'NULL',
	`h9` bigint(20) DEFAULT 'NULL',
	`h10` bigint(20) DEFAULT 'NULL',
	`h11` bigint(20) DEFAULT 'NULL',
	`h12` bigint(20) DEFAULT 'NULL',
	`h13` bigint(20) DEFAULT 'NULL',
	`h14` bigint(20) DEFAULT 'NULL',
	`h15` bigint(20) DEFAULT 'NULL',
	`h16` bigint(20) DEFAULT 'NULL',
	`h17` bigint(20) DEFAULT 'NULL',
	`h18` bigint(20) DEFAULT 'NULL',
	`h19` bigint(20) DEFAULT 'NULL',
	`h20` bigint(20) DEFAULT 'NULL',
	`h21` bigint(20) DEFAULT 'NULL',
	`h22` bigint(20) DEFAULT 'NULL',
	`h23` bigint(20) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `CMI_playtimereward` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`player_id` int(11) DEFAULT 'NULL',
	`repeatable` text DEFAULT 'NULL',
	`onetime` longtext DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `CMI_users` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`player_uuid` text DEFAULT 'NULL',
	`username` text DEFAULT 'NULL',
	`nickname` text DEFAULT 'NULL',
	`LogOutLocation` text DEFAULT 'NULL',
	`DeathLocation` text DEFAULT 'NULL',
	`TeleportLocation` text DEFAULT 'NULL',
	`Homes` text DEFAULT 'NULL',
	`LastLoginTime` bigint(20) DEFAULT 'NULL',
	`LastLogoffTime` bigint(20) DEFAULT 'NULL',
	`TotalPlayTime` bigint(20) DEFAULT 'NULL',
	`tFly` bigint(20) DEFAULT 'NULL',
	`tGod` bigint(20) DEFAULT 'NULL',
	`Glow` text DEFAULT 'NULL',
	`Ips` text DEFAULT 'NULL',
	`Cuffed` tinyint(1) DEFAULT 'NULL',
	`AlertUntil` bigint(20) DEFAULT 'NULL',
	`AlertReason` text DEFAULT 'NULL',
	`JoinedCounter` tinyint(1) DEFAULT 'NULL',
	`LockedIps` text DEFAULT 'NULL',
	`pTime` bigint(20) DEFAULT 'NULL',
	`Kits` text DEFAULT 'NULL',
	`Charges` text DEFAULT 'NULL',
	`Cooldowns` mediumtext DEFAULT 'NULL',
	`Balance` double DEFAULT 'NULL',
	`Notes` text DEFAULT 'NULL',
	`Rank` text DEFAULT 'NULL',
	`BannedUntil` bigint(20) DEFAULT 'NULL',
	`BannedAt` bigint(20) DEFAULT 'NULL',
	`BannedBy` text DEFAULT 'NULL',
	`BanReason` text DEFAULT 'NULL',
	`Ignores` text DEFAULT 'NULL',
	`Vanish` text DEFAULT 'NULL',
	`Economy` text DEFAULT 'NULL',
	`Mail` mediumtext DEFAULT 'NULL',
	`FlightCharge` double DEFAULT 'NULL',
	`UserMeta` text DEFAULT 'NULL',
	`Flying` tinyint(1) DEFAULT 'NULL',
	`Votifier` int(11) DEFAULT 'NULL',
	`Jail` text DEFAULT 'NULL',
	`JailedUntil` bigint(20) DEFAULT 'NULL',
	`FakeAccount` tinyint(1) DEFAULT 'NULL',
	`PlaytimeOptimized` bigint(20) DEFAULT 'NULL',
	`flightChargeEnabled` tinyint(1) DEFAULT 'NULL',
	`JailReason` text DEFAULT 'NULL',
	`Skin` text DEFAULT 'NULL',
	`Collision` tinyint(1) DEFAULT 'NULL',
	`NamePrefix` text DEFAULT 'NULL',
	`NameSuffix` text DEFAULT 'NULL',
	`Warnings` text DEFAULT 'NULL',
	`NameColor` text DEFAULT 'NULL',
	`Muted` text DEFAULT 'NULL',
	`AFRecharge` text DEFAULT 'NULL',
	`DisplayName` text DEFAULT 'NULL',
	`Options` text DEFAULT 'NULL',
	`ChatColor` text DEFAULT 'NULL'
);
--> statement-breakpoint
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
CREATE TABLE `index_mapping` (
	`ENTRY` text DEFAULT 'NULL',
	`BITMASK_INDEX` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `jobs_archive` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userid` int(11) DEFAULT 'NULL',
	`job` text DEFAULT 'NULL',
	`experience` int(11) DEFAULT 'NULL',
	`level` int(11) DEFAULT 'NULL',
	`left` bigint(20) DEFAULT 'NULL',
	`jobid` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `jobs_blocks` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`world` varchar(36) DEFAULT 'NULL',
	`x` int(11) DEFAULT 'NULL',
	`y` int(11) DEFAULT 'NULL',
	`z` int(11) DEFAULT 'NULL',
	`recorded` bigint(20) DEFAULT 'NULL',
	`resets` bigint(20) DEFAULT 'NULL',
	`worldid` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `jobs_exploredata` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`worldname` varchar(64) DEFAULT 'NULL',
	`chunkX` int(11) DEFAULT 'NULL',
	`chunkZ` int(11) DEFAULT 'NULL',
	`playerNames` text DEFAULT 'NULL',
	`worldid` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `jobs_jobnames` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(36) DEFAULT 'NULL',
	CONSTRAINT `template_jobNames` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `jobs_jobs` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userid` int(11) DEFAULT 'NULL',
	`job` text DEFAULT 'NULL',
	`experience` double DEFAULT 'NULL',
	`level` int(11) DEFAULT 'NULL',
	`jobid` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `jobs_limits` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userid` int(11) DEFAULT 'NULL',
	`type` varchar(36) DEFAULT 'NULL',
	`collected` double DEFAULT 'NULL',
	`started` bigint(20) DEFAULT 'NULL',
	`typeid` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `jobs_log` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userid` int(11) DEFAULT 'NULL',
	`time` bigint(20) DEFAULT 'NULL',
	`action` varchar(20) DEFAULT 'NULL',
	`itemname` text DEFAULT 'NULL',
	`count` int(11) DEFAULT 'NULL',
	`money` double DEFAULT 'NULL',
	`exp` double DEFAULT 'NULL',
	`points` double DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `jobs_points` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userid` int(11) DEFAULT 'NULL',
	`totalpoints` double DEFAULT 'NULL',
	`currentpoints` double DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `jobs_users` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`player_uuid` varchar(36) DEFAULT 'NULL',
	`username` text DEFAULT 'NULL',
	`seen` bigint(20) DEFAULT 'NULL',
	`donequests` int(11) DEFAULT 'NULL',
	`quests` text DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `jobs_worlds` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(36) DEFAULT 'NULL',
	CONSTRAINT `template_worlds` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `lands_lands` (
	`ulid` char(26) NOT NULL,
	`server` varchar(32) NOT NULL,
	`world` char(26) NOT NULL,
	`type` tinytext NOT NULL,
	`category` tinytext DEFAULT 'NULL',
	`name` tinytext NOT NULL,
	`nation` char(26) DEFAULT 'NULL',
	`area` mediumtext NOT NULL,
	`members` text NOT NULL,
	`created_at` timestamp NOT NULL,
	`balance` float NOT NULL DEFAULT 0,
	`title` varchar(300) DEFAULT 'NULL',
	`spawn` text DEFAULT 'NULL',
	`inbox` text DEFAULT 'NULL',
	`limits` text DEFAULT 'NULL',
	`shield` bigint(20) NOT NULL DEFAULT 0,
	`stats` text DEFAULT 'NULL',
	`icon` text DEFAULT 'NULL',
	`storage` longtext DEFAULT 'NULL',
	`level` smallint(6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lands_lands_claims` (
	`land` char(26) NOT NULL,
	`world` char(26) NOT NULL,
	`chunks` longtext DEFAULT 'NULL',
	`chunks_amount` mediumint(8) unsigned DEFAULT 'NULL',
	`areas` longtext DEFAULT 'NULL',
	`areas_amount` mediumint(8) unsigned DEFAULT 'NULL',
	`blocks` longtext DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `lands_players` (
	`uuid` char(36) NOT NULL,
	`name` varchar(16) NOT NULL,
	`edit_land` char(26) DEFAULT 'NULL',
	`invites` text DEFAULT 'NULL',
	`limits` text DEFAULT 'NULL',
	`chatmode` tinytext DEFAULT 'NULL',
	`flags` text DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `lands_servers` (
	`server` varchar(32) NOT NULL,
	`last_seen` timestamp NOT NULL,
	`version` tinytext NOT NULL,
	`version_prev` tinytext NOT NULL,
	`timestamps` text DEFAULT 'NULL',
	`flags` text DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `lands_wars` (
	`attacker` char(26) NOT NULL,
	`defender` char(26) NOT NULL,
	`started_at` timestamp NOT NULL,
	`tribute` float NOT NULL DEFAULT 0,
	`attacker_stats` text NOT NULL,
	`defender_stats` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lands_wars_declarations` (
	`attacker` char(26) NOT NULL,
	`defender` char(26) NOT NULL,
	`tribute` float NOT NULL DEFAULT 0,
	`sent_at` timestamp NOT NULL,
	`mutual` bit(1) NOT NULL DEFAULT 'b''0''',
	`preparation_time` bigint(20) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `lands_worlds` (
	`ulid` char(26) NOT NULL,
	`server` varchar(32) NOT NULL,
	`name` tinytext NOT NULL,
	`uid` char(36) NOT NULL,
	`flags_role` text DEFAULT 'NULL',
	`flags_natural` text DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `mcpets_player_data` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`uuid` text DEFAULT 'NULL',
	`names` text DEFAULT 'NULL',
	`inventories` text DEFAULT 'NULL',
	`data` text DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `playerparticles_fixed` (
	`owner_uuid` varchar(36) NOT NULL,
	`id` smallint(6) NOT NULL,
	`particle_uuid` varchar(36) DEFAULT 'NULL',
	`world` varchar(100) DEFAULT 'NULL',
	`xPos` double DEFAULT 'NULL',
	`yPos` double DEFAULT 'NULL',
	`zPos` double DEFAULT 'NULL',
	`yaw` double DEFAULT 0,
	`pitch` double DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `playerparticles_group` (
	`uuid` varchar(36) NOT NULL,
	`owner_uuid` varchar(36) DEFAULT 'NULL',
	`name` varchar(100) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `playerparticles_migrations` (
	`migration_version` int(11) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `playerparticles_particle` (
	`uuid` varchar(36) NOT NULL,
	`group_uuid` varchar(36) DEFAULT 'NULL',
	`id` smallint(6) DEFAULT 'NULL',
	`effect` varchar(100) DEFAULT 'NULL',
	`style` varchar(100) DEFAULT 'NULL',
	`item_material` varchar(100) DEFAULT 'NULL',
	`block_material` varchar(100) DEFAULT 'NULL',
	`note` smallint(6) DEFAULT 'NULL',
	`r` smallint(6) DEFAULT 'NULL',
	`g` smallint(6) DEFAULT 'NULL',
	`b` smallint(6) DEFAULT 'NULL',
	`r_end` smallint(6) DEFAULT 0,
	`g_end` smallint(6) DEFAULT 0,
	`b_end` smallint(6) DEFAULT 0,
	`duration` int(11) DEFAULT 20
);
--> statement-breakpoint
CREATE TABLE `playerparticles_settings` (
	`player_uuid` varchar(36) DEFAULT 'NULL',
	`particles_hidden` tinyint(4) DEFAULT 'NULL',
	`particles_hidden_self` tinyint(4) DEFAULT 0
);
--> statement-breakpoint
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
CREATE TABLE `reputation` (
	`id` bigint(50) AUTO_INCREMENT NOT NULL,
	`uuid` varchar(50) DEFAULT 'NULL',
	`reputation` bigint(50) DEFAULT 'NULL',
	`acceptReputation` tinyint(1) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `tab_groups` (
	`group` varchar(64) DEFAULT 'NULL',
	`property` varchar(16) DEFAULT 'NULL',
	`value` varchar(1024) DEFAULT 'NULL',
	`world` varchar(64) DEFAULT 'NULL',
	`server` varchar(64) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `tab_users` (
	`user` varchar(64) DEFAULT 'NULL',
	`property` varchar(16) DEFAULT 'NULL',
	`value` varchar(1024) DEFAULT 'NULL',
	`world` varchar(64) DEFAULT 'NULL',
	`server` varchar(64) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `user_perferences` (
	`UUID` text DEFAULT 'NULL',
	`NAME` text DEFAULT 'NULL',
	`ITEMSTAND` text DEFAULT 'NULL',
	`ITEMDROP` text DEFAULT 'NULL',
	`HOLOGRAM` text DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `use_lock` (
	`STATUS_LOCK` tinyint(1) DEFAULT 'NULL'
);
--> statement-breakpoint
ALTER TABLE `betonquest_backpack` ADD CONSTRAINT `betonquest_backpack_ibfk_1` FOREIGN KEY (`profileID`) REFERENCES `betonquest_profile`(`profileID`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `betonquest_journal` ADD CONSTRAINT `betonquest_journal_ibfk_1` FOREIGN KEY (`profileID`) REFERENCES `betonquest_profile`(`profileID`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `betonquest_objectives` ADD CONSTRAINT `betonquest_objectives_ibfk_1` FOREIGN KEY (`profileID`) REFERENCES `betonquest_profile`(`profileID`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `betonquest_player` ADD CONSTRAINT `betonquest_player_ibfk_1` FOREIGN KEY (`active_profile`) REFERENCES `betonquest_profile`(`profileID`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `betonquest_player_profile` ADD CONSTRAINT `betonquest_player_profile_ibfk_1` FOREIGN KEY (`playerID`) REFERENCES `betonquest_player`(`playerID`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `betonquest_player_profile` ADD CONSTRAINT `betonquest_player_profile_ibfk_2` FOREIGN KEY (`profileID`) REFERENCES `betonquest_profile`(`profileID`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `betonquest_points` ADD CONSTRAINT `betonquest_points_ibfk_1` FOREIGN KEY (`profileID`) REFERENCES `betonquest_profile`(`profileID`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `betonquest_tags` ADD CONSTRAINT `betonquest_tags_ibfk_1` FOREIGN KEY (`profileID`) REFERENCES `betonquest_profile`(`profileID`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `lands_lands` ADD CONSTRAINT `lands_lands_ibfk_1` FOREIGN KEY (`server`) REFERENCES `lands_servers`(`server`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `lands_lands` ADD CONSTRAINT `lands_lands_ibfk_2` FOREIGN KEY (`world`) REFERENCES `lands_worlds`(`ulid`) ON DELETE no action ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `lands_lands_claims` ADD CONSTRAINT `lands_lands_claims_ibfk_1` FOREIGN KEY (`land`) REFERENCES `lands_lands`(`ulid`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `lands_lands_claims` ADD CONSTRAINT `lands_lands_claims_ibfk_2` FOREIGN KEY (`world`) REFERENCES `lands_worlds`(`ulid`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `lands_players` ADD CONSTRAINT `lands_players_ibfk_1` FOREIGN KEY (`edit_land`) REFERENCES `lands_lands`(`ulid`) ON DELETE set null ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `lands_worlds` ADD CONSTRAINT `lands_worlds_ibfk_1` FOREIGN KEY (`server`) REFERENCES `lands_servers`(`server`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `playerparticles_fixed` ADD CONSTRAINT `playerparticles_fixed_ibfk_1` FOREIGN KEY (`particle_uuid`) REFERENCES `playerparticles_particle`(`uuid`) ON DELETE cascade ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `profileID` ON `betonquest_backpack` (`profileID`);--> statement-breakpoint
CREATE INDEX `profileID` ON `betonquest_journal` (`profileID`);--> statement-breakpoint
CREATE INDEX `active_profile` ON `betonquest_player` (`active_profile`);--> statement-breakpoint
CREATE INDEX `server` ON `lands_lands` (`server`);--> statement-breakpoint
CREATE INDEX `world` ON `lands_lands` (`world`);--> statement-breakpoint
CREATE INDEX `world` ON `lands_lands_claims` (`world`);--> statement-breakpoint
CREATE INDEX `edit_land` ON `lands_players` (`edit_land`);--> statement-breakpoint
CREATE INDEX `server` ON `lands_worlds` (`server`);--> statement-breakpoint
CREATE INDEX `particle_uuid` ON `playerparticles_fixed` (`particle_uuid`);--> statement-breakpoint
CREATE INDEX `playerpoints_username_cache_uuid_index` ON `playerpoints_username_cache` (`uuid`);--> statement-breakpoint
CREATE INDEX `playerpoints_username_cache_username_index` ON `playerpoints_username_cache` (`username`);
*/