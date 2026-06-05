import { mysqlTable, mysqlSchema, AnyMySqlColumn, varchar, text } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const srCache = mysqlTable("sr_cache", {
	name: varchar({ length: 16 }).notNull(),
	uuid: varchar({ length: 36 }).default('NULL'),
	timestamp: bigint({ mode: "number" }).notNull(),
});

export const srCooldowns = mysqlTable("sr_cooldowns", {
	uuid: varchar({ length: 36 }).notNull(),
	groupName: varchar("group_name", { length: 36 }).notNull(),
	creationTime: bigint("creation_time", { mode: "number" }).notNull(),
	duration: bigint({ mode: "number" }).notNull(),
});

export const srCustomSkins = mysqlTable("sr_custom_skins", {
	name: varchar({ length: 36 }).notNull(),
	value: text().notNull(),
	signature: text().notNull(),
	displayName: text("display_name").default('NULL'),
});

export const srPlayers = mysqlTable("sr_players", {
	uuid: varchar({ length: 36 }).notNull(),
	skinIdentifier: varchar("skin_identifier", { length: 2083 }).default('NULL'),
	skinVariant: varchar("skin_variant", { length: 20 }).default('NULL'),
	skinType: varchar("skin_type", { length: 20 }).default('NULL'),
});

export const srPlayerFavourites = mysqlTable("sr_player_favourites", {
	uuid: varchar({ length: 36 }).notNull(),
	timestamp: bigint({ mode: "number" }).notNull(),
	skinIdentifier: varchar("skin_identifier", { length: 2083 }).notNull(),
	skinVariant: varchar("skin_variant", { length: 20 }).default('NULL'),
	skinType: varchar("skin_type", { length: 20 }).notNull(),
});

export const srPlayerHistory = mysqlTable("sr_player_history", {
	uuid: varchar({ length: 36 }).notNull(),
	timestamp: bigint({ mode: "number" }).notNull(),
	skinIdentifier: varchar("skin_identifier", { length: 2083 }).notNull(),
	skinVariant: varchar("skin_variant", { length: 20 }).default('NULL'),
	skinType: varchar("skin_type", { length: 20 }).notNull(),
});

export const srPlayerSkins = mysqlTable("sr_player_skins", {
	uuid: varchar({ length: 36 }).notNull(),
	lastKnownName: varchar("last_known_name", { length: 16 }).default('NULL'),
	value: text().notNull(),
	signature: text().notNull(),
	timestamp: bigint({ mode: "number" }).notNull(),
});

export const srUrlIndex = mysqlTable("sr_url_index", {
	url: varchar({ length: 266 }).notNull(),
	skinVariant: varchar("skin_variant", { length: 20 }).default('NULL'),
});

export const srUrlSkins = mysqlTable("sr_url_skins", {
	url: varchar({ length: 266 }).notNull(),
	mineSkinId: varchar("mine_skin_id", { length: 36 }).default('NULL'),
	value: text().notNull(),
	signature: text().notNull(),
	skinVariant: varchar("skin_variant", { length: 20 }).default('NULL'),
});
