import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, unique, varchar, index } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const playerpointsMigrations = mysqlTable("playerpoints_migrations", {
	migrationVersion: int("migration_version").notNull(),
});

export const playerpointsPoints = mysqlTable("playerpoints_points", {
	id: int().autoincrement().notNull(),
	uuid: varchar({ length: 36 }).notNull(),
	points: int().notNull(),
},
(table) => [
	unique("uuid").on(table.uuid),
]);

export const playerpointsUsernameCache = mysqlTable("playerpoints_username_cache", {
	uuid: varchar({ length: 36 }).notNull(),
	username: varchar({ length: 30 }).notNull(),
},
(table) => [
	index("playerpoints_username_cache_uuid_index").on(table.uuid),
	index("playerpoints_username_cache_username_index").on(table.username),
	unique("uuid").on(table.uuid),
]);
