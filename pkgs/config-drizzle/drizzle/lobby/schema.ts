import { mysqlTable, mysqlSchema, AnyMySqlColumn, varchar, tinytext, int } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const ajparkourPlayers = mysqlTable("ajparkour_players", {
	id: varchar({ length: 36 }).notNull(),
	material: tinytext().default('NULL'),
	name: varchar({ length: 17 }).default('NULL'),
	gamesplayed: int().default('NULL'),
});

export const ajparkourScores = mysqlTable("ajparkour_scores", {
	id: int().autoincrement().notNull(),
	area: tinytext().default('NULL'),
	player: varchar({ length: 36 }).default('NULL'),
	score: int().default('NULL'),
	time: int().default('NULL'),
});

export const ijEnabledPlayers = mysqlTable("ij_enabled_players", {
	worldName: varchar("World_Name", { length: 1000 }).default('NULL'),
	playerUuid: varchar("Player_UUID", { length: 1000 }).default('NULL'),
	itemName: varchar("Item_Name", { length: 1000 }).default('NULL'),
	isEnabled: varchar({ length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});

export const ijFirstCommands = mysqlTable("ij_first_commands", {
	worldName: varchar("World_Name", { length: 1000 }).default('NULL'),
	playerUuid: varchar("Player_UUID", { length: 1000 }).default('NULL'),
	commandString: varchar("Command_String", { length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});

export const ijFirstJoin = mysqlTable("ij_first_join", {
	playerUuid: varchar("Player_UUID", { length: 1000 }).default('NULL'),
	itemName: varchar("Item_Name", { length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});

export const ijFirstWorld = mysqlTable("ij_first_world", {
	worldName: varchar("World_Name", { length: 1000 }).default('NULL'),
	playerUuid: varchar("Player_UUID", { length: 1000 }).default('NULL'),
	itemName: varchar("Item_Name", { length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});

export const ijIpLimits = mysqlTable("ij_ip_limits", {
	worldName: varchar("World_Name", { length: 1000 }).default('NULL'),
	ipAddress: varchar("IP_Address", { length: 1000 }).default('NULL'),
	playerUuid: varchar("Player_UUID", { length: 1000 }).default('NULL'),
	itemName: varchar("Item_Name", { length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});

export const ijMapIds = mysqlTable("ij_map_ids", {
	mapImg: varchar("Map_IMG", { length: 1000 }).default('NULL'),
	mapId: varchar("Map_ID", { length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});

export const ijOnCooldown = mysqlTable("ij_on_cooldown", {
	worldName: varchar("World_Name", { length: 1000 }).default('NULL'),
	itemName: varchar("Item_Name", { length: 1000 }).default('NULL'),
	playerUuid: varchar("Player_UUID", { length: 1000 }).default('NULL'),
	cooldown: varchar("Cooldown", { length: 1000 }).default('NULL'),
	duration: varchar("Duration", { length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});

export const ijReturnCraftitems = mysqlTable("ij_return_craftitems", {
	playerUuid: varchar("Player_UUID", { length: 1000 }).default('NULL'),
	inventory64: varchar("Inventory64", { length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});

export const ijReturnItems = mysqlTable("ij_return_items", {
	worldName: varchar("World_Name", { length: 1000 }).default('NULL'),
	regionName: varchar("Region_Name", { length: 1000 }).default('NULL'),
	playerUuid: varchar("Player_UUID", { length: 1000 }).default('NULL'),
	inventory64: varchar("Inventory64", { length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});

export const ijReturnSwitchItems = mysqlTable("ij_return_switch_items", {
	worldName: varchar("World_Name", { length: 1000 }).default('NULL'),
	playerUuid: varchar("Player_UUID", { length: 1000 }).default('NULL'),
	inventory64: varchar("Inventory64", { length: 1000 }).default('NULL'),
	timeStamp: varchar("Time_Stamp", { length: 1000 }).default('NULL'),
});
