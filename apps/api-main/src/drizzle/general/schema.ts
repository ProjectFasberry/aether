import { pgTable, index, varchar, bigint, integer, text, boolean, timestamp, jsonb, unique, check, foreignKey, uuid, bigserial, serial, uniqueIndex, primaryKey, date, pgSequence, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const donationType = pgEnum("donation_type", ['authentic', 'loyal', 'arkhont'])
export const paymentCryptoTonStatus = pgEnum("payment_crypto_ton_status", ['created', 'received', 'captured', 'cancelled', 'failed'])
export const paymentStatus = pgEnum("payment_status", ['pending', 'waitingForCapture', 'succeeded', 'canceled'])
export const playerActivityEvent = pgEnum("player_activity_event", ['join', 'quit'])
export const storeCurrency = pgEnum("store_currency", ['CHARISM', 'BELKOIN'])

export const libertybansPunishmentIds = pgSequence("libertybans_punishment_ids", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775806", cache: "1", cycle: false })
export const libertybansVictimIds = pgSequence("libertybans_victim_ids", {  startWith: "-2147483648", increment: "1", minValue: "-2147483648", maxValue: "2147483647", cache: "1", cycle: false })
export const libertybansTrackIds = pgSequence("libertybans_track_ids", {  startWith: "1", increment: "1", minValue: "-2147483648", maxValue: "2147483647", cache: "1", cycle: false })
export const libertybansScopeIds = pgSequence("libertybans_scope_ids", {  startWith: "1", increment: "1", minValue: "-2147483648", maxValue: "2147483647", cache: "1", cycle: false })

export const auth = pgTable("AUTH", {
	nickname: varchar("NICKNAME", { length: 255 }).notNull(),
	lowercasenickname: varchar("LOWERCASENICKNAME", { length: 255 }).primaryKey().notNull(),
	hash: varchar("HASH", { length: 255 }).notNull(),
	ip: varchar("IP", { length: 255 }),
	totptoken: varchar("TOTPTOKEN", { length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	regdate: bigint("REGDATE", { mode: "number" }),
	uuid: varchar("UUID", { length: 255 }),
	premiumuuid: varchar("PREMIUMUUID", { length: 255 }),
	loginip: varchar("LOGINIP", { length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	logindate: bigint("LOGINDATE", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	issuedtime: bigint("ISSUEDTIME", { mode: "number" }),
}, (table) => [
	index("AUTH_IP_idx").using("btree", table.ip.asc().nullsLast().op("text_ops")),
	index("AUTH_PREMIUMUUID_idx").using("btree", table.premiumuuid.asc().nullsLast().op("text_ops")),
]);

export const currencies = pgTable("currencies", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "currencies_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	imageUrl: text().notNull(),
	isPublic: boolean().default(true).notNull(),
	isAvailable: boolean().default(true).notNull(),
	title: text().notNull(),
	value: text().notNull(),
});

export const events = pgTable("events", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "events_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	description: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	reward: text(),
	origin: text().notNull(),
});

export const eventsOriginal = pgTable("events_original", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "events_original_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	type: text().notNull(),
});

export const facts = pgTable("facts", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "facts_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	fact: text().notNull(),
});

export const findout = pgTable("findout", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "findout_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nickname: text().notNull(),
	value: text().notNull(),
});

export const social = pgTable("SOCIAL", {
	lowercasenickname: varchar("LOWERCASENICKNAME", { length: 255 }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vkId: bigint("VK_ID", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	telegramId: bigint("TELEGRAM_ID", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	discordId: bigint("DISCORD_ID", { mode: "number" }),
	blocked: boolean("BLOCKED"),
	totpEnabled: boolean("TOTP_ENABLED"),
	notifyEnabled: boolean("NOTIFY_ENABLED"),
});

export const ipList = pgTable("ip_list", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "ip_list_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	ip: text().notNull(),
	name: text().notNull(),
});

export const items = pgTable("items", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "items_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	description: text(),
	title: text().notNull(),
	image: text().notNull(),
});

export const likes = pgTable("likes", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "likes_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	initiator: text().notNull(),
	recipient: text().notNull(),
});

export const modpacks = pgTable("modpacks", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "modpacks_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	imageUrl: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	client: text().notNull(),
	mods: text().notNull(),
	name: text().notNull(),
	shaders: text(),
	version: text().notNull(),
});

export const news = pgTable("news", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "news_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	imageUrl: text().notNull(),
	content: jsonb().notNull(),
	creator: text().notNull(),
});

export const newsViews = pgTable("news_views", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "news_views_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	initiator: text().notNull(),
	newsId: integer("news_id").notNull(),
}, (table) => [
	unique("news_views_news_id_initiator_uniq").on(table.initiator, table.newsId),
	check("news_views_initiator_length", sql`char_length(initiator) >= 2`),
]);

export const referrals = pgTable("referrals", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "referrals_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completed: boolean().default(false).notNull(),
	referrer: text().notNull(),
	referral: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.referrer],
			foreignColumns: [players.nickname],
			name: "referrals_constraint_key_2"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.referral],
			foreignColumns: [players.nickname],
			name: "referrals_constraint_key_3"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const storeCartItems = pgTable("store_cart_items", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "store_cart_items_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	initiator: text().notNull(),
	productId: integer("product_id").notNull(),
	priceSnapshot: text("price_snapshot").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	quantity: integer().notNull(),
	selected: boolean().default(true).notNull(),
	recipient: text().notNull(),
}, (table) => [
	unique("product_id_initiator").on(table.initiator, table.productId),
]);

export const storeEconomy = pgTable("store_economy", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "store_economy_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	type: text().notNull(),
	value: text().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	imageUrl: text().notNull(),
});

export const storePromotionStyles = pgTable("store_promotion_styles", {
	type: text().notNull(),
	color: text().notNull(),
	icon: text().notNull(),
	label: text().notNull(),
});

export const storePromotions = pgTable("store_promotions", {
	id: uuid().primaryKey().notNull(),
	itemId: integer("item_id").notNull(),
	type: text().notNull(),
	value: text().notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	title: text().notNull(),
	priority: text().notNull(),
});

export const votedUsers = pgTable("voted_users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "voted_users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nickname: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const storeItems = pgTable("store_items", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "stpre_items_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	imageUrl: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	price: bigint({ mode: "number" }).notNull(),
	type: text().notNull(),
	currency: storeCurrency().notNull(),
	value: text().notNull(),
	command: text(),
	content: jsonb().notNull(),
	description: text(),
}, (table) => [
	index("items_title_trgm").using("gin", table.title.asc().nullsLast().op("gin_trgm_ops")),
]);

export const options = pgTable("options", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "options_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	value: boolean().notNull(),
	title: text().notNull(),
});

export const activityUsers = pgTable("activity_users", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	nickname: text().notNull(),
	event: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	type: playerActivityEvent().notNull(),
});

export const fvItems = pgTable("fv_items", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "fv_items_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nickname: text().notNull(),
	itemId: integer("item_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const roles = pgTable("roles", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
});

export const permissions = pgTable("permissions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "permissions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
}, (table) => [
	unique("permissions_name_key").on(table.name),
]);

export const paymentMethods = pgTable("payment_methods", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "payment_methods_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	value: text().notNull(),
	description: text(),
	imageUrl: text().notNull(),
	isAvailable: boolean().default(true).notNull(),
});

export const bannersViews = pgTable("banners_views", {
	bannerId: integer("banner_id"),
	nickname: text().notNull(),
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "banners_views_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
}, (table) => [
	foreignKey({
			columns: [table.bannerId],
			foreignColumns: [banners.id],
			name: "banners_views_constraint_1"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.nickname],
			foreignColumns: [players.nickname],
			name: "banners_views_constraint_2"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("banners_views_id_key").on(table.id),
]);

export const banners = pgTable("banners", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "banners_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	description: text(),
	hrefTitle: text("href_title").notNull(),
	hrefValue: text("href_value").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const players = pgTable("players", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nickname: text().notNull(),
	roleId: integer("role_id").default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	uuid: text().notNull(),
	premiumUuid: text("premium_uuid"),
	lowerCaseNickname: text("lower_case_nickname").notNull(),
	// TODO: failed to parse database type 'tsvector'
	nicknameTsv: unknown("nickname_tsv"),
}, (table) => [
	uniqueIndex("idx_players_lower_case_nickname").using("btree", table.lowerCaseNickname.asc().nullsLast().op("text_ops")),
	index("idx_players_nickname_tsv").using("gin", table.nicknameTsv.asc().nullsLast().op("tsvector_ops")),
	uniqueIndex("idx_players_uuid").using("btree", table.uuid.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "constraint_1"
		}).onUpdate("cascade"),
	unique("players_uuid_key").on(table.uuid),
	unique("players_lowercasenickname_key").on(table.lowerCaseNickname),
	unique("players_lower_case_nickname_key").on(table.lowerCaseNickname),
]);

export const tasks = pgTable("tasks", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "tasks_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	description: text().notNull(),
	rewardValue: integer("reward_value").notNull(),
	rewardCurrency: text("reward_currency").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expires: timestamp({ withTimezone: true, mode: 'string' }),
	actionType: text("action_type").notNull(),
	actionValue: text("action_value"),
});

export const adminActivityLog = pgTable("admin_activity_log", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "admin_activity_log_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	initiator: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	event: text().notNull(),
});

export const privatedChat = pgTable("privated_chat", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "privated_chat_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	nickname: text().notNull(),
	message: text().notNull(),
	edited: boolean().default(false).notNull(),
	editedAt: timestamp("edited_at", { withTimezone: true, mode: 'string' }),
});

export const dictionaries = pgTable("dictionaries", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "dictionaries_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	key: text().notNull(),
	value: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const chatViews = pgTable("chat_views", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "chat_views_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	messageId: integer("message_id").notNull(),
	nickname: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("chat_views_constraint_1").on(table.messageId, table.nickname),
]);

export const rules = pgTable("rules", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "rules_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	content: jsonb().notNull(),
	category: text().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("rules_category_key").on(table.category),
]);

export const wikiGroups = pgTable("wiki_groups", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "wiki_groups_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	title: text().notNull(),
});

export const wiki = pgTable("wiki", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "wiki_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	category: text().notNull(),
	content: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	categoryTitle: text("category_title").notNull(),
	groupId: integer("group_id").default(1).notNull(),
}, (table) => [
	unique("wiki_category_key").on(table.category),
]);

export const playersSocials = pgTable("players_socials", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "players_socials_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nickname: text().notNull(),
	social: text().notNull(),
	value: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "api_keys_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	key: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	nickname: text().notNull(),
});

export const paymentsGameChilds = pgTable("payments_game_childs", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "payments_game_childs_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	storeItemId: integer("store_item_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	recipient: text().notNull(),
	orderId: text("order_id").notNull(),
});

export const tgLogsChats = pgTable("tg_logs_chats", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "tg_logs_chats_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	chatId: text("chat_id").notNull(),
});

export const playersSocialsAvailable = pgTable("players_socials_available", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "players_socials_available_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	value: text().notNull(),
	isAvailable: boolean().default(true),
});

export const payments = pgTable("payments", {
	id: integer().notNull(),
	orderId: text("order_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: paymentStatus().notNull(),
	payload: text().notNull(),
	price: text().notNull(),
	invoiceId: integer("invoice_id").notNull(),
	uniqueId: text("unique_id").notNull(),
	payUrl: text("pay_url").notNull(),
	asset: text().notNull(),
	initiator: text().notNull(),
	comment: text(),
});

export const paymentsGame = pgTable("payments_game", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "te_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	uniqueId: text("unique_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	initiator: text().notNull(),
});

export const libraryBackgrounds = pgTable("library_backgrounds", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "library_backgrounds_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text(),
	url: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const servers = pgTable("servers", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "servers_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	fullname: text().notNull(),
	available: boolean().default(false).notNull(),
	excluded: boolean().default(false).notNull(),
	description: text(),
	thumbnail: text().notNull(),
	origin: text().notNull(),
});

export const rolePermissions = pgTable("role_permissions", {
	roleId: integer("role_id").notNull(),
	permissionId: integer("permission_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "role_perms_constraint_2"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "role_perms_constraint_3"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.permissionId, table.roleId], name: "role_perms_constraint_1"}),
]);

export const playersPermissions = pgTable("players_permissions", {
	nickname: text().notNull(),
	permissionId: integer("permission_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "players_permissions_constraint_1"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.nickname],
			foreignColumns: [players.nickname],
			name: "players_permissions_constraint_2"
		}).onUpdate("cascade").onDelete("cascade"),
	primaryKey({ columns: [table.nickname, table.permissionId], name: "players_permissions_constraint_3"}),
]);

export const activityHeatmap = pgTable("activity_heatmap", {
	date: date().notNull(),
	hour: integer().notNull(),
	activePlayers: integer("active_players").notNull(),
}, (table) => [
	primaryKey({ columns: [table.date, table.hour], name: "constraint_1"}),
]);
