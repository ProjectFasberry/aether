-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `ajparkour_players` (
	`id` varchar(36) NOT NULL,
	`material` tinytext DEFAULT 'NULL',
	`name` varchar(17) DEFAULT 'NULL',
	`gamesplayed` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ajparkour_scores` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`area` tinytext DEFAULT 'NULL',
	`player` varchar(36) DEFAULT 'NULL',
	`score` int(11) DEFAULT 'NULL',
	`time` int(11) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_enabled_players` (
	`World_Name` varchar(1000) DEFAULT 'NULL',
	`Player_UUID` varchar(1000) DEFAULT 'NULL',
	`Item_Name` varchar(1000) DEFAULT 'NULL',
	`isEnabled` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_first_commands` (
	`World_Name` varchar(1000) DEFAULT 'NULL',
	`Player_UUID` varchar(1000) DEFAULT 'NULL',
	`Command_String` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_first_join` (
	`Player_UUID` varchar(1000) DEFAULT 'NULL',
	`Item_Name` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_first_world` (
	`World_Name` varchar(1000) DEFAULT 'NULL',
	`Player_UUID` varchar(1000) DEFAULT 'NULL',
	`Item_Name` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_ip_limits` (
	`World_Name` varchar(1000) DEFAULT 'NULL',
	`IP_Address` varchar(1000) DEFAULT 'NULL',
	`Player_UUID` varchar(1000) DEFAULT 'NULL',
	`Item_Name` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_map_ids` (
	`Map_IMG` varchar(1000) DEFAULT 'NULL',
	`Map_ID` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_on_cooldown` (
	`World_Name` varchar(1000) DEFAULT 'NULL',
	`Item_Name` varchar(1000) DEFAULT 'NULL',
	`Player_UUID` varchar(1000) DEFAULT 'NULL',
	`Cooldown` varchar(1000) DEFAULT 'NULL',
	`Duration` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_return_craftitems` (
	`Player_UUID` varchar(1000) DEFAULT 'NULL',
	`Inventory64` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_return_items` (
	`World_Name` varchar(1000) DEFAULT 'NULL',
	`Region_Name` varchar(1000) DEFAULT 'NULL',
	`Player_UUID` varchar(1000) DEFAULT 'NULL',
	`Inventory64` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);
--> statement-breakpoint
CREATE TABLE `ij_return_switch_items` (
	`World_Name` varchar(1000) DEFAULT 'NULL',
	`Player_UUID` varchar(1000) DEFAULT 'NULL',
	`Inventory64` varchar(1000) DEFAULT 'NULL',
	`Time_Stamp` varchar(1000) DEFAULT 'NULL'
);

*/