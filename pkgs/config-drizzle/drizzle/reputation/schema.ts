import { mysqlTable, mysqlSchema, AnyMySqlColumn, varchar } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const commands = mysqlTable("commands", {
	id: bigint({ mode: "number" }).default('NULL'),
	commandId: varchar({ length: 50 }).default('NULL'),
});

export const favorites = mysqlTable("favorites", {
	id: bigint({ mode: "number" }).default('NULL'),
	favorite: bigint({ mode: "number" }).default('NULL'),
	action: varchar({ length: 50 }).default('NULL'),
});

export const reputation = mysqlTable("reputation", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	uuid: varchar({ length: 50 }).default('NULL'),
	reputation: bigint({ mode: "number" }).default('NULL'),
	acceptReputation: tinyint().default('NULL'),
});
