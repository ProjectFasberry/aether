import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, index, foreignKey, unique, double } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const planAccessLog = mysqlTable("plan_access_log", {
	id: int().autoincrement().notNull(),
	time: bigint({ mode: "number" }).notNull(),
	fromIp: varchar("from_ip", { length: 45 }).default('NULL'),
	requestMethod: varchar("request_method", { length: 8 }).notNull(),
	requestUri: text("request_uri").notNull(),
	responseCode: int("response_code").default('NULL'),
});

export const planAllowlistBounce = mysqlTable("plan_allowlist_bounce", {
	id: int().autoincrement().notNull(),
	uuid: varchar({ length: 36 }).notNull(),
	name: varchar({ length: 36 }).notNull(),
	serverId: int("server_id").notNull().references(() => planServers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	times: int().default(0).notNull(),
	lastBounce: bigint("last_bounce", { mode: "number" }).notNull(),
},
(table) => [
	index("server_id").on(table.serverId),
	unique("uuid").on(table.uuid),
]);

export const planCookies = mysqlTable("plan_cookies", {
	id: int().autoincrement().notNull(),
	webUsername: varchar("web_username", { length: 100 }).notNull(),
	expires: bigint({ mode: "number" }).notNull(),
	cookie: varchar({ length: 64 }).notNull(),
});

export const planExtensionGroups = mysqlTable("plan_extension_groups", {
	id: int().autoincrement().notNull(),
	uuid: varchar({ length: 36 }).notNull(),
	groupName: varchar("group_name", { length: 50 }).default('NULL'),
	providerId: int("provider_id").notNull().references(() => planExtensionProviders.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("provider_id").on(table.providerId),
]);

export const planExtensionIcons = mysqlTable("plan_extension_icons", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 50 }).default('\'question\'').notNull(),
	family: varchar({ length: 15 }).default('\'SOLID\'').notNull(),
	color: varchar({ length: 25 }).default('\'NONE\'').notNull(),
});

export const planExtensionPlugins = mysqlTable("plan_extension_plugins", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 50 }).notNull(),
	lastUpdated: bigint("last_updated", { mode: "number" }).notNull(),
	serverUuid: varchar("server_uuid", { length: 36 }).notNull(),
	iconId: int("icon_id").notNull().references(() => planExtensionIcons.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("icon_id").on(table.iconId),
]);

export const planExtensionProviders = mysqlTable("plan_extension_providers", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 50 }).notNull(),
	text: varchar({ length: 50 }).notNull(),
	description: varchar({ length: 150 }).default('NULL'),
	priority: int().default(0).notNull(),
	showInPlayersTable: tinyint("show_in_players_table").default(0).notNull(),
	groupable: tinyint().default(0).notNull(),
	conditionName: varchar("condition_name", { length: 54 }).default('NULL'),
	providedCondition: varchar("provided_condition", { length: 50 }).default('NULL'),
	formatType: varchar("format_type", { length: 25 }).default('NULL'),
	hidden: tinyint().default(0).notNull(),
	playerName: tinyint("player_name").default(0).notNull(),
	pluginId: int("plugin_id").notNull().references(() => planExtensionPlugins.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	iconId: int("icon_id").notNull().references(() => planExtensionIcons.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	tabId: int("tab_id").default('NULL').references(() => planExtensionTabs.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("plugin_id").on(table.pluginId),
	index("icon_id").on(table.iconId),
	index("tab_id").on(table.tabId),
]);

export const planExtensionServerTableValues = mysqlTable("plan_extension_server_table_values", {
	id: int().autoincrement().notNull(),
	uuid: varchar({ length: 36 }).notNull(),
	tableRow: int("table_row").default(0).notNull(),
	col1Value: varchar("col_1_value", { length: 250 }).default('NULL'),
	col2Value: varchar("col_2_value", { length: 250 }).default('NULL'),
	col3Value: varchar("col_3_value", { length: 250 }).default('NULL'),
	col4Value: varchar("col_4_value", { length: 250 }).default('NULL'),
	col5Value: varchar("col_5_value", { length: 250 }).default('NULL'),
	tableId: int("table_id").notNull().references(() => planExtensionTables.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("table_id").on(table.tableId),
]);

export const planExtensionServerValues = mysqlTable("plan_extension_server_values", {
	id: int().autoincrement().notNull(),
	booleanValue: tinyint("boolean_value").default('NULL'),
	doubleValue: double("double_value").default('NULL'),
	percentageValue: double("percentage_value").default('NULL'),
	longValue: bigint("long_value", { mode: "number" }).default('NULL'),
	stringValue: varchar("string_value", { length: 250 }).default('NULL'),
	componentValue: varchar("component_value", { length: 500 }).default('NULL'),
	groupValue: varchar("group_value", { length: 50 }).default('NULL'),
	providerId: int("provider_id").notNull().references(() => planExtensionProviders.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("provider_id").on(table.providerId),
]);

export const planExtensionTables = mysqlTable("plan_extension_tables", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 50 }).notNull(),
	color: varchar({ length: 25 }).default('\'NONE\'').notNull(),
	valuesFor: int("values_for").default(0),
	conditionName: varchar("condition_name", { length: 54 }).default('NULL'),
	col1Name: varchar("col_1_name", { length: 50 }).default('NULL'),
	col2Name: varchar("col_2_name", { length: 50 }).default('NULL'),
	col3Name: varchar("col_3_name", { length: 50 }).default('NULL'),
	col4Name: varchar("col_4_name", { length: 50 }).default('NULL'),
	col5Name: varchar("col_5_name", { length: 50 }).default('NULL'),
	pluginId: int("plugin_id").notNull().references(() => planExtensionPlugins.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	icon1Id: int("icon_1_id").default('NULL').references(() => planExtensionIcons.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	icon2Id: int("icon_2_id").default('NULL').references(() => planExtensionIcons.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	icon3Id: int("icon_3_id").default('NULL').references(() => planExtensionIcons.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	icon4Id: int("icon_4_id").default('NULL').references(() => planExtensionIcons.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	icon5Id: int("icon_5_id").default('NULL').references(() => planExtensionIcons.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	format1: varchar("format_1", { length: 15 }).default('NULL'),
	format2: varchar("format_2", { length: 15 }).default('NULL'),
	format3: varchar("format_3", { length: 15 }).default('NULL'),
	format4: varchar("format_4", { length: 15 }).default('NULL'),
	format5: varchar("format_5", { length: 15 }).default('NULL'),
	tabId: int("tab_id").default('NULL').references(() => planExtensionTabs.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("plugin_id").on(table.pluginId),
	index("icon_1_id").on(table.icon1Id),
	index("icon_2_id").on(table.icon2Id),
	index("icon_3_id").on(table.icon3Id),
	index("icon_4_id").on(table.icon4Id),
	index("icon_5_id").on(table.icon5Id),
	index("tab_id").on(table.tabId),
]);

export const planExtensionTabs = mysqlTable("plan_extension_tabs", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 50 }).notNull(),
	elementOrder: varchar("element_order", { length: 100 }).default('\'VALUES,GRAPH,TABLE\'').notNull(),
	tabPriority: int("tab_priority").notNull(),
	pluginId: int("plugin_id").notNull().references(() => planExtensionPlugins.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	iconId: int("icon_id").notNull().references(() => planExtensionIcons.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("plugin_id").on(table.pluginId),
	index("icon_id").on(table.iconId),
]);

export const planExtensionUserTableValues = mysqlTable("plan_extension_user_table_values", {
	id: int().autoincrement().notNull(),
	uuid: varchar({ length: 36 }).notNull(),
	tableRow: int("table_row").default(0).notNull(),
	col1Value: varchar("col_1_value", { length: 250 }).default('NULL'),
	col2Value: varchar("col_2_value", { length: 250 }).default('NULL'),
	col3Value: varchar("col_3_value", { length: 250 }).default('NULL'),
	col4Value: varchar("col_4_value", { length: 250 }).default('NULL'),
	tableId: int("table_id").notNull().references(() => planExtensionTables.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("table_id").on(table.tableId),
]);

export const planExtensionUserValues = mysqlTable("plan_extension_user_values", {
	id: int().autoincrement().notNull(),
	booleanValue: tinyint("boolean_value").default('NULL'),
	doubleValue: double("double_value").default('NULL'),
	percentageValue: double("percentage_value").default('NULL'),
	longValue: bigint("long_value", { mode: "number" }).default('NULL'),
	stringValue: varchar("string_value", { length: 250 }).default('NULL'),
	componentValue: varchar("component_value", { length: 500 }).default('NULL'),
	groupValue: varchar("group_value", { length: 50 }).default('NULL'),
	uuid: varchar({ length: 36 }).notNull(),
	providerId: int("provider_id").notNull().references(() => planExtensionProviders.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("provider_id").on(table.providerId),
]);

export const planGeolocations = mysqlTable("plan_geolocations", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => planUsers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	geolocation: varchar({ length: 50 }).notNull(),
	lastUsed: bigint("last_used", { mode: "number" }).notNull(),
},
(table) => [
	index("user_id").on(table.userId),
]);

export const planJoinAddress = mysqlTable("plan_join_address", {
	id: int().autoincrement().notNull(),
	joinAddress: varchar("join_address", { length: 191 }).default('NULL'),
},
(table) => [
	unique("join_address").on(table.joinAddress),
]);

export const planKills = mysqlTable("plan_kills", {
	id: int().autoincrement().notNull(),
	killerUuid: varchar("killer_uuid", { length: 36 }).notNull(),
	victimUuid: varchar("victim_uuid", { length: 36 }).notNull(),
	serverUuid: varchar("server_uuid", { length: 36 }).notNull(),
	weapon: varchar({ length: 30 }).notNull(),
	date: bigint({ mode: "number" }).notNull(),
	sessionId: int("session_id").notNull().references(() => planSessions.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("session_id").on(table.sessionId),
	index("plan_kills_uuid_index").on(table.killerUuid, table.victimUuid, table.serverUuid),
	index("plan_kills_date_index").on(table.date),
]);

export const planNicknames = mysqlTable("plan_nicknames", {
	id: int().autoincrement().notNull(),
	uuid: varchar({ length: 36 }).notNull(),
	nickname: varchar({ length: 75 }).notNull(),
	serverUuid: varchar("server_uuid", { length: 36 }).notNull(),
	lastUsed: bigint("last_used", { mode: "number" }).notNull(),
});

export const planPing = mysqlTable("plan_ping", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => planUsers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	serverId: int("server_id").notNull().references(() => planServers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	date: bigint({ mode: "number" }).notNull(),
	maxPing: int("max_ping").notNull(),
	minPing: int("min_ping").notNull(),
	avgPing: double("avg_ping").notNull(),
},
(table) => [
	index("user_id").on(table.userId),
	index("server_id").on(table.serverId),
	index("plan_ping_date_index").on(table.date),
]);

export const planPluginVersions = mysqlTable("plan_plugin_versions", {
	id: int().autoincrement().notNull(),
	serverId: int("server_id").notNull().references(() => planServers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	pluginName: varchar("plugin_name", { length: 100 }).notNull(),
	version: varchar({ length: 255 }).default('NULL'),
	modified: bigint({ mode: "number" }).notNull(),
},
(table) => [
	index("server_id").on(table.serverId),
]);

export const planSecurity = mysqlTable("plan_security", {
	id: int().autoincrement().notNull(),
	username: varchar({ length: 100 }).notNull(),
	linkedToUuid: varchar("linked_to_uuid", { length: 36 }).default('\''),
	saltedPassHash: varchar("salted_pass_hash", { length: 100 }).notNull(),
	groupId: int("group_id").notNull().references(() => planWebGroup.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("group_id").on(table.groupId),
	unique("username").on(table.username),
	unique("salted_pass_hash").on(table.saltedPassHash),
]);

export const planServers = mysqlTable("plan_servers", {
	id: int().autoincrement().notNull(),
	uuid: varchar({ length: 36 }).notNull(),
	name: varchar({ length: 100 }).default('NULL'),
	webAddress: varchar("web_address", { length: 100 }).default('NULL'),
	isInstalled: tinyint("is_installed").default(1).notNull(),
	isProxy: tinyint("is_proxy").default(0).notNull(),
	planVersion: varchar("plan_version", { length: 18 }).default('NULL'),
},
(table) => [
	unique("uuid").on(table.uuid),
]);

export const planSessions = mysqlTable("plan_sessions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => planUsers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	serverId: int("server_id").notNull().references(() => planServers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	sessionStart: bigint("session_start", { mode: "number" }).notNull(),
	sessionEnd: bigint("session_end", { mode: "number" }).notNull(),
	mobKills: int("mob_kills").notNull(),
	deaths: int().notNull(),
	afkTime: bigint("afk_time", { mode: "number" }).notNull(),
	joinAddressId: int("join_address_id").default(1).notNull(),
},
(table) => [
	index("user_id").on(table.userId),
	index("server_id").on(table.serverId),
	index("plan_sessions_date_index").on(table.sessionStart),
	index("plan_session_join_address_index").on(table.joinAddressId),
]);

export const planSettings = mysqlTable("plan_settings", {
	id: int().autoincrement().notNull(),
	serverUuid: varchar("server_uuid", { length: 39 }).notNull(),
	updated: bigint({ mode: "number" }).notNull(),
	content: text().notNull(),
},
(table) => [
	unique("server_uuid").on(table.serverUuid),
]);

export const planTps = mysqlTable("plan_tps", {
	id: int().autoincrement().notNull(),
	serverId: int("server_id").notNull().references(() => planServers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	date: bigint({ mode: "number" }).notNull(),
	tps: double().notNull(),
	playersOnline: int("players_online").notNull(),
	cpuUsage: double("cpu_usage").notNull(),
	ramUsage: bigint("ram_usage", { mode: "number" }).notNull(),
	entities: int().notNull(),
	chunksLoaded: int("chunks_loaded").notNull(),
	freeDiskSpace: bigint("free_disk_space", { mode: "number" }).notNull(),
},
(table) => [
	index("server_id").on(table.serverId),
	index("plan_tps_date_index").on(table.date),
]);

export const planUsers = mysqlTable("plan_users", {
	id: int().autoincrement().notNull(),
	uuid: varchar({ length: 36 }).notNull(),
	registered: bigint({ mode: "number" }).notNull(),
	name: varchar({ length: 36 }).notNull(),
	timesKicked: int("times_kicked").default(0).notNull(),
},
(table) => [
	index("plan_users_uuid_index").on(table.uuid),
	unique("uuid").on(table.uuid),
]);

export const planUserInfo = mysqlTable("plan_user_info", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => planUsers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	serverId: int("server_id").notNull().references(() => planServers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	joinAddress: varchar("join_address", { length: 191 }).default('NULL'),
	registered: bigint({ mode: "number" }).notNull(),
	opped: tinyint().default(0).notNull(),
	banned: tinyint().default(0).notNull(),
},
(table) => [
	index("user_id").on(table.userId),
	index("server_id").on(table.serverId),
]);

export const planWebGroup = mysqlTable("plan_web_group", {
	id: int().autoincrement().notNull(),
	groupName: varchar("group_name", { length: 100 }).notNull(),
},
(table) => [
	unique("group_name").on(table.groupName),
]);

export const planWebGroupToPermission = mysqlTable("plan_web_group_to_permission", {
	id: int().autoincrement().notNull(),
	groupId: int("group_id").notNull().references(() => planWebGroup.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	permissionId: int("permission_id").notNull().references(() => planWebPermission.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("group_id").on(table.groupId),
	index("permission_id").on(table.permissionId),
]);

export const planWebPermission = mysqlTable("plan_web_permission", {
	id: int().autoincrement().notNull(),
	permission: varchar({ length: 100 }).notNull(),
},
(table) => [
	unique("permission").on(table.permission),
]);

export const planWebUserPreferences = mysqlTable("plan_web_user_preferences", {
	id: int().autoincrement().notNull(),
	preferences: text().notNull(),
	webUserId: int("web_user_id").default('NULL').references(() => planSecurity.id, { onDelete: "restrict", onUpdate: "restrict" } ),
},
(table) => [
	index("web_user_id").on(table.webUserId),
]);

export const planWorlds = mysqlTable("plan_worlds", {
	id: int().autoincrement().notNull(),
	worldName: varchar("world_name", { length: 100 }).notNull(),
	serverUuid: varchar("server_uuid", { length: 36 }).notNull(),
});

export const planWorldTimes = mysqlTable("plan_world_times", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => planUsers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	worldId: int("world_id").notNull().references(() => planWorlds.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	serverId: int("server_id").notNull().references(() => planServers.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	sessionId: int("session_id").notNull().references(() => planSessions.id, { onDelete: "restrict", onUpdate: "restrict" } ),
	survivalTime: bigint("survival_time", { mode: "number" }).notNull(),
	creativeTime: bigint("creative_time", { mode: "number" }).notNull(),
	adventureTime: bigint("adventure_time", { mode: "number" }).notNull(),
	spectatorTime: bigint("spectator_time", { mode: "number" }).notNull(),
},
(table) => [
	index("world_id").on(table.worldId),
	index("session_id").on(table.sessionId),
	index("user_id").on(table.userId),
	index("server_id").on(table.serverId),
]);
