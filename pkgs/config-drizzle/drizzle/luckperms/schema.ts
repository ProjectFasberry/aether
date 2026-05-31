import { pgTable, index, unique, serial, varchar, boolean, bigint, char, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const luckpermsUserPermissions = pgTable(
	"luckperms_user_permissions",
	{
		id: serial().primaryKey().notNull(),
		uuid: varchar({ length: 36 }).notNull(),
		permission: varchar({ length: 200 }).notNull(),
		value: boolean().notNull(),
		server: varchar({ length: 36 }).notNull(),
		world: varchar({ length: 64 }).notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		expiry: bigint({ mode: "number" }).notNull(),
		contexts: varchar({ length: 200 }).notNull(),
	},
	(table) => [
		index("luckperms_user_permissions_uuid").using("btree", table.uuid.asc().nullsLast().op("text_ops")),
		unique("unique_uuid_permission").on(table.uuid, table.permission),
	],
);

export const luckpermsGroupPermissions = pgTable(
	"luckperms_group_permissions",
	{
		id: serial().primaryKey().notNull(),
		name: varchar({ length: 36 }).notNull(),
		permission: varchar({ length: 200 }).notNull(),
		value: boolean().notNull(),
		server: varchar({ length: 36 }).notNull(),
		world: varchar({ length: 64 }).notNull(),
		// You can use { mode: "bigint" } if numbers are exceeding js number limitations
		expiry: bigint({ mode: "number" }).notNull(),
		contexts: varchar({ length: 200 }).notNull(),
	},
	(table) => [index("luckperms_group_permissions_name").using("btree", table.name.asc().nullsLast().op("text_ops"))],
);

export const luckpermsGroups = pgTable("luckperms_groups", {
	name: varchar({ length: 36 }).primaryKey().notNull(),
});

export const luckpermsActions = pgTable("luckperms_actions", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	time: bigint({ mode: "number" }).notNull(),
	actorUuid: varchar("actor_uuid", { length: 36 }).notNull(),
	actorName: varchar("actor_name", { length: 100 }).notNull(),
	type: char({ length: 1 }).notNull(),
	actedUuid: varchar("acted_uuid", { length: 36 }).notNull(),
	actedName: varchar("acted_name", { length: 36 }).notNull(),
	action: varchar({ length: 300 }).notNull(),
});

export const luckpermsTracks = pgTable("luckperms_tracks", {
	name: varchar({ length: 36 }).primaryKey().notNull(),
	groups: text().notNull(),
});

export const luckpermsPlayers = pgTable(
	"luckperms_players",
	{
		uuid: varchar({ length: 36 }).primaryKey().notNull(),
		username: varchar({ length: 16 }).notNull(),
		primaryGroup: varchar("primary_group", { length: 36 }).notNull(),
	},
	(table) => [index("luckperms_players_username").using("btree", table.username.asc().nullsLast().op("text_ops"))],
);
