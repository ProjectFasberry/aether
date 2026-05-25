import { mysqlTable, mysqlSchema, AnyMySqlColumn, index, foreignKey, int, char, text, varchar, timestamp, unique, longtext, datetime, mediumtext, double, tinytext, float, smallint } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const betonquestBackpack = mysqlTable("betonquest_backpack", {
	id: int().autoincrement().notNull(),
	profileId: char({ length: 36 }).notNull().references(() => betonquestProfile.profileId, { onDelete: "cascade", onUpdate: "restrict" } ),
	instruction: text().notNull(),
	amount: int().notNull(),
},
(table) => [
	index("profileID").on(table.profileId),
]);

export const betonquestGlobalPoints = mysqlTable("betonquest_global_points", {
	category: varchar({ length: 256 }).notNull(),
	count: int().notNull(),
});

export const betonquestGlobalTags = mysqlTable("betonquest_global_tags", {
	tag: varchar({ length: 510 }).notNull(),
});

export const betonquestJournal = mysqlTable("betonquest_journal", {
	id: int().autoincrement().notNull(),
	profileId: char({ length: 36 }).notNull().references(() => betonquestProfile.profileId, { onDelete: "cascade", onUpdate: "restrict" } ),
	pointer: varchar({ length: 255 }).notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
},
(table) => [
	index("profileID").on(table.profileId),
]);

export const betonquestMigration = mysqlTable("betonquest_migration", {
	namespace: varchar({ length: 63 }).notNull(),
	migrationId: int("migration_id").notNull(),
	time: timestamp({ mode: 'string' }).default('current_timestamp()'),
});

export const betonquestObjectives = mysqlTable("betonquest_objectives", {
	profileId: char({ length: 36 }).notNull().references(() => betonquestProfile.profileId, { onDelete: "cascade", onUpdate: "restrict" } ),
	objective: varchar({ length: 510 }).notNull(),
	instructions: varchar({ length: 2046 }).notNull(),
});

export const betonquestPlayer = mysqlTable("betonquest_player", {
	playerId: char({ length: 36 }).notNull(),
	activeProfile: char("active_profile", { length: 36 }).notNull().references(() => betonquestProfile.profileId, { onDelete: "restrict", onUpdate: "restrict" } ),
	language: varchar({ length: 16 }).notNull(),
	conversation: varchar({ length: 510 }).default('NULL'),
},
(table) => [
	index("active_profile").on(table.activeProfile),
]);

export const betonquestPlayerProfile = mysqlTable("betonquest_player_profile", {
	playerId: char({ length: 36 }).notNull().references(() => betonquestPlayer.playerId, { onDelete: "cascade", onUpdate: "restrict" } ),
	profileId: char({ length: 36 }).notNull().references(() => betonquestProfile.profileId, { onDelete: "cascade", onUpdate: "restrict" } ),
	name: varchar({ length: 63 }).notNull(),
},
(table) => [
	unique("playerID").on(table.playerId, table.name),
]);

export const betonquestPoints = mysqlTable("betonquest_points", {
	profileId: char({ length: 36 }).notNull().references(() => betonquestProfile.profileId, { onDelete: "cascade", onUpdate: "restrict" } ),
	category: varchar({ length: 255 }).notNull(),
	count: int().notNull(),
});

export const betonquestProfile = mysqlTable("betonquest_profile", {
	profileId: char({ length: 36 }).notNull(),
});

export const betonquestTags = mysqlTable("betonquest_tags", {
	profileId: char({ length: 36 }).notNull().references(() => betonquestProfile.profileId, { onDelete: "cascade", onUpdate: "restrict" } ),
	tag: varchar({ length: 510 }).notNull(),
});

export const chatControl = mysqlTable("ChatControl", {
	uuid: varchar("UUID", { length: 64 }).notNull(),
	name: text("Name").default('NULL'),
	nick: text("Nick").default('NULL'),
	data: longtext("Data").default('NULL'),
	lastModified: bigint("LastModified", { mode: "number" }).default('NULL'),
});

export const chatControlLog = mysqlTable("ChatControl_Log", {
	id: int("Id").autoincrement().notNull(),
	server: text("Server").default('NULL'),
	date: datetime("Date", { mode: 'string'}).default('NULL'),
	type: text("Type").default('NULL'),
	sender: text("Sender").default('NULL'),
	receiver: text("Receiver").default('NULL'),
	content: longtext("Content").default('NULL'),
	channelName: text("ChannelName").default('NULL'),
	ruleName: text("RuleName").default('NULL'),
	ruleGroupName: text("RuleGroupName").default('NULL'),
});

export const chatControlMail = mysqlTable("ChatControl_Mail", {
	uuid: varchar("UUID", { length: 64 }).notNull(),
	data: longtext("Data").default('NULL'),
});

export const cmiInventories = mysqlTable("CMI_inventories", {
	id: int().autoincrement().notNull(),
	playerId: int("player_id").default('NULL'),
	inventories: longtext().default('NULL'),
});

export const cmiPlaytime = mysqlTable("CMI_playtime", {
	id: int().autoincrement().notNull(),
	playerId: int("player_id").default('NULL'),
	date: int().default('NULL'),
	h0: bigint({ mode: "number" }).default('NULL'),
	h1: bigint({ mode: "number" }).default('NULL'),
	h2: bigint({ mode: "number" }).default('NULL'),
	h3: bigint({ mode: "number" }).default('NULL'),
	h4: bigint({ mode: "number" }).default('NULL'),
	h5: bigint({ mode: "number" }).default('NULL'),
	h6: bigint({ mode: "number" }).default('NULL'),
	h7: bigint({ mode: "number" }).default('NULL'),
	h8: bigint({ mode: "number" }).default('NULL'),
	h9: bigint({ mode: "number" }).default('NULL'),
	h10: bigint({ mode: "number" }).default('NULL'),
	h11: bigint({ mode: "number" }).default('NULL'),
	h12: bigint({ mode: "number" }).default('NULL'),
	h13: bigint({ mode: "number" }).default('NULL'),
	h14: bigint({ mode: "number" }).default('NULL'),
	h15: bigint({ mode: "number" }).default('NULL'),
	h16: bigint({ mode: "number" }).default('NULL'),
	h17: bigint({ mode: "number" }).default('NULL'),
	h18: bigint({ mode: "number" }).default('NULL'),
	h19: bigint({ mode: "number" }).default('NULL'),
	h20: bigint({ mode: "number" }).default('NULL'),
	h21: bigint({ mode: "number" }).default('NULL'),
	h22: bigint({ mode: "number" }).default('NULL'),
	h23: bigint({ mode: "number" }).default('NULL'),
});

export const cmiPlaytimereward = mysqlTable("CMI_playtimereward", {
	id: int().autoincrement().notNull(),
	playerId: int("player_id").default('NULL'),
	repeatable: text().default('NULL'),
	onetime: longtext().default('NULL'),
});

export const cmiUsers = mysqlTable("CMI_users", {
	id: int().autoincrement().notNull(),
	playerUuid: text("player_uuid").default('NULL'),
	username: text().default('NULL'),
	nickname: text().default('NULL'),
	logOutLocation: text("LogOutLocation").default('NULL'),
	deathLocation: text("DeathLocation").default('NULL'),
	teleportLocation: text("TeleportLocation").default('NULL'),
	homes: text("Homes").default('NULL'),
	lastLoginTime: bigint("LastLoginTime", { mode: "number" }).default('NULL'),
	lastLogoffTime: bigint("LastLogoffTime", { mode: "number" }).default('NULL'),
	totalPlayTime: bigint("TotalPlayTime", { mode: "number" }).default('NULL'),
	tFly: bigint({ mode: "number" }).default('NULL'),
	tGod: bigint({ mode: "number" }).default('NULL'),
	glow: text("Glow").default('NULL'),
	ips: text("Ips").default('NULL'),
	cuffed: tinyint("Cuffed").default('NULL'),
	alertUntil: bigint("AlertUntil", { mode: "number" }).default('NULL'),
	alertReason: text("AlertReason").default('NULL'),
	joinedCounter: tinyint("JoinedCounter").default('NULL'),
	lockedIps: text("LockedIps").default('NULL'),
	pTime: bigint({ mode: "number" }).default('NULL'),
	kits: text("Kits").default('NULL'),
	charges: text("Charges").default('NULL'),
	cooldowns: mediumtext("Cooldowns").default('NULL'),
	balance: double("Balance").default('NULL'),
	notes: text("Notes").default('NULL'),
	rank: text("Rank").default('NULL'),
	bannedUntil: bigint("BannedUntil", { mode: "number" }).default('NULL'),
	bannedAt: bigint("BannedAt", { mode: "number" }).default('NULL'),
	bannedBy: text("BannedBy").default('NULL'),
	banReason: text("BanReason").default('NULL'),
	ignores: text("Ignores").default('NULL'),
	vanish: text("Vanish").default('NULL'),
	economy: text("Economy").default('NULL'),
	mail: mediumtext("Mail").default('NULL'),
	flightCharge: double("FlightCharge").default('NULL'),
	userMeta: text("UserMeta").default('NULL'),
	flying: tinyint("Flying").default('NULL'),
	votifier: int("Votifier").default('NULL'),
	jail: text("Jail").default('NULL'),
	jailedUntil: bigint("JailedUntil", { mode: "number" }).default('NULL'),
	fakeAccount: tinyint("FakeAccount").default('NULL'),
	playtimeOptimized: bigint("PlaytimeOptimized", { mode: "number" }).default('NULL'),
	flightChargeEnabled: tinyint().default('NULL'),
	jailReason: text("JailReason").default('NULL'),
	skin: text("Skin").default('NULL'),
	collision: tinyint("Collision").default('NULL'),
	namePrefix: text("NamePrefix").default('NULL'),
	nameSuffix: text("NameSuffix").default('NULL'),
	warnings: text("Warnings").default('NULL'),
	nameColor: text("NameColor").default('NULL'),
	muted: text("Muted").default('NULL'),
	afRecharge: text("AFRecharge").default('NULL'),
	displayName: text("DisplayName").default('NULL'),
	options: text("Options").default('NULL'),
	chatColor: text("ChatColor").default('NULL'),
});

export const commands = mysqlTable("commands", {
	id: bigint({ mode: "number" }).default('NULL'),
	commandId: varchar({ length: 50 }).default('NULL'),
});

export const favorites = mysqlTable("favorites", {
	id: bigint({ mode: "number" }).default('NULL'),
	favorite: bigint({ mode: "number" }).default('NULL'),
	action: varchar({ length: 50 }).default('NULL'),
});

export const indexMapping = mysqlTable("index_mapping", {
	entry: text("ENTRY").default('NULL'),
	bitmaskIndex: int("BITMASK_INDEX").default('NULL'),
});

export const jobsArchive = mysqlTable("jobs_archive", {
	id: int().autoincrement().notNull(),
	userid: int().default('NULL'),
	job: text().default('NULL'),
	experience: int().default('NULL'),
	level: int().default('NULL'),
	left: bigint({ mode: "number" }).default('NULL'),
	jobid: int().default('NULL'),
});

export const jobsBlocks = mysqlTable("jobs_blocks", {
	id: int().autoincrement().notNull(),
	world: varchar({ length: 36 }).default('NULL'),
	x: int().default('NULL'),
	y: int().default('NULL'),
	z: int().default('NULL'),
	recorded: bigint({ mode: "number" }).default('NULL'),
	resets: bigint({ mode: "number" }).default('NULL'),
	worldid: int().default('NULL'),
});

export const jobsExploredata = mysqlTable("jobs_exploredata", {
	id: int().autoincrement().notNull(),
	worldname: varchar({ length: 64 }).default('NULL'),
	chunkX: int().default('NULL'),
	chunkZ: int().default('NULL'),
	playerNames: text().default('NULL'),
	worldid: int().default('NULL'),
});

export const jobsJobnames = mysqlTable("jobs_jobnames", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 36 }).default('NULL'),
},
(table) => [
	unique("template_jobNames").on(table.name),
]);

export const jobsJobs = mysqlTable("jobs_jobs", {
	id: int().autoincrement().notNull(),
	userid: int().default('NULL'),
	job: text().default('NULL'),
	experience: double().default('NULL'),
	level: int().default('NULL'),
	jobid: int().default('NULL'),
});

export const jobsLimits = mysqlTable("jobs_limits", {
	id: int().autoincrement().notNull(),
	userid: int().default('NULL'),
	type: varchar({ length: 36 }).default('NULL'),
	collected: double().default('NULL'),
	started: bigint({ mode: "number" }).default('NULL'),
	typeid: int().default('NULL'),
});

export const jobsLog = mysqlTable("jobs_log", {
	id: int().autoincrement().notNull(),
	userid: int().default('NULL'),
	time: bigint({ mode: "number" }).default('NULL'),
	action: varchar({ length: 20 }).default('NULL'),
	itemname: text().default('NULL'),
	count: int().default('NULL'),
	money: double().default('NULL'),
	exp: double().default('NULL'),
	points: double().default('NULL'),
});

export const jobsPoints = mysqlTable("jobs_points", {
	id: int().autoincrement().notNull(),
	userid: int().default('NULL'),
	totalpoints: double().default('NULL'),
	currentpoints: double().default('NULL'),
});

export const jobsUsers = mysqlTable("jobs_users", {
	id: int().autoincrement().notNull(),
	playerUuid: varchar("player_uuid", { length: 36 }).default('NULL'),
	username: text().default('NULL'),
	seen: bigint({ mode: "number" }).default('NULL'),
	donequests: int().default('NULL'),
	quests: text().default('NULL'),
});

export const jobsWorlds = mysqlTable("jobs_worlds", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 36 }).default('NULL'),
},
(table) => [
	unique("template_worlds").on(table.name),
]);

export const landsLands = mysqlTable("lands_lands", {
	ulid: char({ length: 26 }).notNull(),
	server: varchar({ length: 32 }).notNull().references(() => landsServers.server, { onDelete: "cascade", onUpdate: "restrict" } ),
	world: char({ length: 26 }).notNull().references(() => landsWorlds.ulid, { onUpdate: "restrict" } ),
	type: tinytext().notNull(),
	category: tinytext().default('NULL'),
	name: tinytext().notNull(),
	nation: char({ length: 26 }).default('NULL'),
	area: mediumtext().notNull(),
	members: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	balance: float().notNull(),
	title: varchar({ length: 300 }).default('NULL'),
	spawn: text().default('NULL'),
	inbox: text().default('NULL'),
	limits: text().default('NULL'),
	shield: bigint({ mode: "number" }).notNull(),
	stats: text().default('NULL'),
	icon: text().default('NULL'),
	storage: longtext().default('NULL'),
	level: smallint().notNull(),
},
(table) => [
	index("server").on(table.server),
	index("world").on(table.world),
]);

export const landsLandsClaims = mysqlTable("lands_lands_claims", {
	land: char({ length: 26 }).notNull().references(() => landsLands.ulid, { onDelete: "cascade", onUpdate: "restrict" } ),
	world: char({ length: 26 }).notNull().references(() => landsWorlds.ulid, { onDelete: "cascade", onUpdate: "restrict" } ),
	chunks: longtext().default('NULL'),
	chunksAmount: mediumint("chunks_amount").default('NULL'),
	areas: longtext().default('NULL'),
	areasAmount: mediumint("areas_amount").default('NULL'),
	blocks: longtext().default('NULL'),
},
(table) => [
	index("world").on(table.world),
]);

export const landsPlayers = mysqlTable("lands_players", {
	uuid: char({ length: 36 }).notNull(),
	name: varchar({ length: 16 }).notNull(),
	editLand: char("edit_land", { length: 26 }).default('NULL').references(() => landsLands.ulid, { onDelete: "set null", onUpdate: "restrict" } ),
	invites: text().default('NULL'),
	limits: text().default('NULL'),
	chatmode: tinytext().default('NULL'),
	flags: text().default('NULL'),
},
(table) => [
	index("edit_land").on(table.editLand),
]);

export const landsServers = mysqlTable("lands_servers", {
	server: varchar({ length: 32 }).notNull(),
	lastSeen: timestamp("last_seen", { mode: 'string' }).notNull(),
	version: tinytext().notNull(),
	versionPrev: tinytext("version_prev").notNull(),
	timestamps: text().default('NULL'),
	flags: text().default('NULL'),
});

export const landsWars = mysqlTable("lands_wars", {
	attacker: char({ length: 26 }).notNull(),
	defender: char({ length: 26 }).notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).notNull(),
	tribute: float().notNull(),
	attackerStats: text("attacker_stats").notNull(),
	defenderStats: text("defender_stats").notNull(),
});

export const landsWarsDeclarations = mysqlTable("lands_wars_declarations", {
	attacker: char({ length: 26 }).notNull(),
	defender: char({ length: 26 }).notNull(),
	tribute: float().notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }).notNull(),
	// Warning: Can't parse bit(1) from database
	// bit(1)Type: bit(1)("mutual").notNull(),
	preparationTime: bigint("preparation_time", { mode: "number" }).default('NULL'),
});

export const landsWorlds = mysqlTable("lands_worlds", {
	ulid: char({ length: 26 }).notNull(),
	server: varchar({ length: 32 }).notNull().references(() => landsServers.server, { onDelete: "cascade", onUpdate: "restrict" } ),
	name: tinytext().notNull(),
	uid: char({ length: 36 }).notNull(),
	flagsRole: text("flags_role").default('NULL'),
	flagsNatural: text("flags_natural").default('NULL'),
},
(table) => [
	index("server").on(table.server),
]);

export const mcpetsPlayerData = mysqlTable("mcpets_player_data", {
	id: int().autoincrement().notNull(),
	uuid: text().default('NULL'),
	names: text().default('NULL'),
	inventories: text().default('NULL'),
	data: text().default('NULL'),
});

export const playerparticlesFixed = mysqlTable("playerparticles_fixed", {
	ownerUuid: varchar("owner_uuid", { length: 36 }).notNull(),
	id: smallint().notNull(),
	particleUuid: varchar("particle_uuid", { length: 36 }).default('NULL').references(() => playerparticlesParticle.uuid, { onDelete: "cascade", onUpdate: "restrict" } ),
	world: varchar({ length: 100 }).default('NULL'),
	xPos: double().default('NULL'),
	yPos: double().default('NULL'),
	zPos: double().default('NULL'),
	yaw: double(),
	pitch: double(),
},
(table) => [
	index("particle_uuid").on(table.particleUuid),
]);

export const playerparticlesGroup = mysqlTable("playerparticles_group", {
	uuid: varchar({ length: 36 }).notNull(),
	ownerUuid: varchar("owner_uuid", { length: 36 }).default('NULL'),
	name: varchar({ length: 100 }).default('NULL'),
});

export const playerparticlesMigrations = mysqlTable("playerparticles_migrations", {
	migrationVersion: int("migration_version").notNull(),
});

export const playerparticlesParticle = mysqlTable("playerparticles_particle", {
	uuid: varchar({ length: 36 }).notNull(),
	groupUuid: varchar("group_uuid", { length: 36 }).default('NULL'),
	id: smallint().default('NULL'),
	effect: varchar({ length: 100 }).default('NULL'),
	style: varchar({ length: 100 }).default('NULL'),
	itemMaterial: varchar("item_material", { length: 100 }).default('NULL'),
	blockMaterial: varchar("block_material", { length: 100 }).default('NULL'),
	note: smallint().default('NULL'),
	r: smallint().default('NULL'),
	g: smallint().default('NULL'),
	b: smallint().default('NULL'),
	rEnd: smallint("r_end"),
	gEnd: smallint("g_end"),
	bEnd: smallint("b_end"),
	duration: int().default(20),
});

export const playerparticlesSettings = mysqlTable("playerparticles_settings", {
	playerUuid: varchar("player_uuid", { length: 36 }).default('NULL'),
	particlesHidden: tinyint("particles_hidden").default('NULL'),
	particlesHiddenSelf: tinyint("particles_hidden_self").default(0),
});

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

export const reputation = mysqlTable("reputation", {
	id: bigint({ mode: "number" }).autoincrement().notNull(),
	uuid: varchar({ length: 50 }).default('NULL'),
	reputation: bigint({ mode: "number" }).default('NULL'),
	acceptReputation: tinyint().default('NULL'),
});

export const tabGroups = mysqlTable("tab_groups", {
	group: varchar({ length: 64 }).default('NULL'),
	property: varchar({ length: 16 }).default('NULL'),
	value: varchar({ length: 1024 }).default('NULL'),
	world: varchar({ length: 64 }).default('NULL'),
	server: varchar({ length: 64 }).default('NULL'),
});

export const tabUsers = mysqlTable("tab_users", {
	user: varchar({ length: 64 }).default('NULL'),
	property: varchar({ length: 16 }).default('NULL'),
	value: varchar({ length: 1024 }).default('NULL'),
	world: varchar({ length: 64 }).default('NULL'),
	server: varchar({ length: 64 }).default('NULL'),
});

export const userPerferences = mysqlTable("user_perferences", {
	uuid: text("UUID").default('NULL'),
	name: text("NAME").default('NULL'),
	itemstand: text("ITEMSTAND").default('NULL'),
	itemdrop: text("ITEMDROP").default('NULL'),
	hologram: text("HOLOGRAM").default('NULL'),
});

export const useLock = mysqlTable("use_lock", {
	statusLock: tinyint("STATUS_LOCK").default('NULL'),
});
