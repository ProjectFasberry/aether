import { pgTable, index, check, varchar, bigint, boolean, integer, text, timestamp, unique, uuid, jsonb, bigserial, serial, foreignKey, uniqueIndex, primaryKey, date, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const playerActivityEvent = pgEnum("player_activity_event", ['join', 'quit'])
export const storeCurrency = pgEnum("store_currency", ['CHARISM', 'BELKOIN'])


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
	check("AUTH_NICKNAME_not_null", sql`NOT NULL "NICKNAME"`),
	check("AUTH_LOWERCASENICKNAME_not_null", sql`NOT NULL "LOWERCASENICKNAME"`),
	check("AUTH_HASH_not_null", sql`NOT NULL "HASH"`),
]);

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
}, (table) => [
	check("SOCIAL_LOWERCASENICKNAME_not_null", sql`NOT NULL "LOWERCASENICKNAME"`),
]);

export const currencies = pgTable("currencies", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "currencies_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	imageUrl: text().notNull(),
	isPublic: boolean().default(true).notNull(),
	isAvailable: boolean().default(true).notNull(),
	title: text().notNull(),
	value: text().notNull(),
}, (table) => [
	check("currencies_id_not_null", sql`NOT NULL id`),
	check("currencies_imageUrl_not_null", sql`NOT NULL "imageUrl"`),
	check("currencies_isPublic_not_null", sql`NOT NULL "isPublic"`),
	check("currencies_isAvailable_not_null", sql`NOT NULL "isAvailable"`),
	check("currencies_title_not_null", sql`NOT NULL title`),
	check("currencies_value_not_null", sql`NOT NULL value`),
]);

export const events = pgTable("events", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "events_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	description: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	reward: text(),
	origin: text().notNull(),
}, (table) => [
	check("events_id_not_null", sql`NOT NULL id`),
	check("events_title_not_null", sql`NOT NULL title`),
	check("events_description_not_null", sql`NOT NULL description`),
	check("events_origin_not_null", sql`NOT NULL origin`),
]);

export const eventsOriginal = pgTable("events_original", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "events_original_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	type: text().notNull(),
}, (table) => [
	check("events_original_id_not_null", sql`NOT NULL id`),
	check("events_original_type_not_null", sql`NOT NULL type`),
]);

export const facts = pgTable("facts", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "facts_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	fact: text().notNull(),
}, (table) => [
	check("facts_id_not_null", sql`NOT NULL id`),
	check("facts_fact_not_null", sql`NOT NULL fact`),
]);

export const findout = pgTable("findout", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "findout_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nickname: text().notNull(),
	value: text().notNull(),
}, (table) => [
	check("findout_id_not_null", sql`NOT NULL id`),
	check("findout_nickname_not_null", sql`NOT NULL nickname`),
	check("findout_value_not_null", sql`NOT NULL value`),
]);

export const ipList = pgTable("ip_list", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "ip_list_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	ip: text().notNull(),
	name: text().notNull(),
}, (table) => [
	check("ip_list_id_not_null", sql`NOT NULL id`),
	check("ip_list_ip_not_null", sql`NOT NULL ip`),
	check("ip_list_name_not_null", sql`NOT NULL name`),
]);

export const items = pgTable("items", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "items_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	description: text(),
	title: text().notNull(),
	image: text().notNull(),
}, (table) => [
	check("items_id_not_null", sql`NOT NULL id`),
	check("items_title_not_null", sql`NOT NULL title`),
	check("items_image_not_null", sql`NOT NULL image`),
]);

export const likes = pgTable("likes", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "likes_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	initiator: text().notNull(),
	recipient: text().notNull(),
}, (table) => [
	check("likes_id_not_null", sql`NOT NULL id`),
	check("likes_created_at_not_null", sql`NOT NULL created_at`),
	check("likes_initiator_not_null", sql`NOT NULL initiator`),
	check("likes_recipient_not_null", sql`NOT NULL recipient`),
]);

export const modpacks = pgTable("modpacks", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "modpacks_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	imageUrl: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	client: text().notNull(),
	mods: text().notNull(),
	name: text().notNull(),
	shaders: text(),
	version: text().notNull(),
}, (table) => [
	check("modpacks_id_not_null", sql`NOT NULL id`),
	check("modpacks_imageUrl_not_null", sql`NOT NULL "imageUrl"`),
	check("modpacks_created_at_not_null", sql`NOT NULL created_at`),
	check("modpacks_client_not_null", sql`NOT NULL client`),
	check("modpacks_mods_not_null", sql`NOT NULL mods`),
	check("modpacks_name_not_null", sql`NOT NULL name`),
	check("modpacks_version_not_null", sql`NOT NULL version`),
]);

export const news = pgTable("news", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "news_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	tags: text(),
	mediaLinks: text("media_links"),
	imageUrl: text().notNull(),
}, (table) => [
	check("news_id_not_null", sql`NOT NULL id`),
	check("news_created_at_not_null", sql`NOT NULL created_at`),
	check("news_title_not_null", sql`NOT NULL title`),
	check("news_description_not_null", sql`NOT NULL description`),
	check("news_imageUrl_not_null", sql`NOT NULL "imageUrl"`),
]);

export const newsViews = pgTable("news_views", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "news_views_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	initiator: text().notNull(),
	newsId: integer("news_id").notNull(),
}, (table) => [
	unique("news_views_news_id_initiator_uniq").on(table.initiator, table.newsId),
	check("news_views_id_not_null", sql`NOT NULL id`),
	check("news_views_initiator_not_null", sql`NOT NULL initiator`),
	check("news_views_news_id_not_null", sql`NOT NULL news_id`),
	check("news_views_initiator_length", sql`char_length(initiator) >= 2`),
]);

export const referrals = pgTable("referrals", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "referrals_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	completed: boolean().default(false).notNull(),
	initiator: text().notNull(),
	recipient: text().notNull(),
}, (table) => [
	check("referrals_id_not_null", sql`NOT NULL id`),
	check("referrals_created_at_not_null", sql`NOT NULL created_at`),
	check("referrals_completed_not_null", sql`NOT NULL completed`),
	check("referrals_initiator_not_null", sql`NOT NULL initiator`),
	check("referrals_recipient_not_null", sql`NOT NULL recipient`),
]);

export const rules = pgTable("rules", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "rules_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	subtitle: text(),
	punishment: text(),
	ruleListId: text("rule_list_id").notNull(),
}, (table) => [
	check("rules_id_not_null", sql`NOT NULL id`),
	check("rules_title_not_null", sql`NOT NULL title`),
	check("rules_rule_list_id_not_null", sql`NOT NULL rule_list_id`),
]);

export const rulesTermins = pgTable("rules_termins", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "rules_termins_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	articleDesc: text("article_desc").notNull(),
	articleTitle: text("article_title").notNull(),
}, (table) => [
	check("rules_termins_id_not_null", sql`NOT NULL id`),
	check("rules_termins_article_desc_not_null", sql`NOT NULL article_desc`),
	check("rules_termins_article_title_not_null", sql`NOT NULL article_title`),
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
	check("store_cart_items_id_not_null", sql`NOT NULL id`),
	check("store_cart_items_initiator_not_null", sql`NOT NULL initiator`),
	check("store_cart_items_product_id_not_null", sql`NOT NULL product_id`),
	check("store_cart_items_price_snapshot_not_null", sql`NOT NULL price_snapshot`),
	check("store_cart_items_created_at_not_null", sql`NOT NULL created_at`),
	check("store_cart_items_quantity_not_null", sql`NOT NULL quantity`),
	check("store_cart_items_selected_not_null", sql`NOT NULL selected`),
	check("store_cart_items_recipient_not_null", sql`NOT NULL recipient`),
]);

export const storeEconomy = pgTable("store_economy", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "store_economy_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	type: text().notNull(),
	value: text().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	imageUrl: text().notNull(),
}, (table) => [
	check("store_economy_id_not_null", sql`NOT NULL id`),
	check("store_economy_type_not_null", sql`NOT NULL type`),
	check("store_economy_value_not_null", sql`NOT NULL value`),
	check("store_economy_title_not_null", sql`NOT NULL title`),
	check("store_economy_description_not_null", sql`NOT NULL description`),
	check("store_economy_imageUrl_not_null", sql`NOT NULL "imageUrl"`),
]);

export const storePromotionStyles = pgTable("store_promotion_styles", {
	type: text().notNull(),
	color: text().notNull(),
	icon: text().notNull(),
	label: text().notNull(),
}, (table) => [
	check("store_promotion_styles_type_not_null", sql`NOT NULL type`),
	check("store_promotion_styles_color_not_null", sql`NOT NULL color`),
	check("store_promotion_styles_icon_not_null", sql`NOT NULL icon`),
	check("store_promotion_styles_label_not_null", sql`NOT NULL label`),
]);

export const storePromotions = pgTable("store_promotions", {
	id: uuid().primaryKey().notNull(),
	itemId: integer("item_id").notNull(),
	type: text().notNull(),
	value: text().notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	title: text().notNull(),
	priority: text().notNull(),
}, (table) => [
	check("store_promotions_id_not_null", sql`NOT NULL id`),
	check("store_promotions_item_id_not_null", sql`NOT NULL item_id`),
	check("store_promotions_type_not_null", sql`NOT NULL type`),
	check("store_promotions_value_not_null", sql`NOT NULL value`),
	check("store_promotions_starts_at_not_null", sql`NOT NULL starts_at`),
	check("store_promotions_title_not_null", sql`NOT NULL title`),
	check("store_promotions_priority_not_null", sql`NOT NULL priority`),
]);

export const votedUsers = pgTable("voted_users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "voted_users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nickname: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("voted_users_id_not_null", sql`NOT NULL id`),
	check("voted_users_nickname_not_null", sql`NOT NULL nickname`),
	check("voted_users_created_at_not_null", sql`NOT NULL created_at`),
]);

export const storeItems = pgTable("store_items", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "stpre_items_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	description: jsonb(),
	imageUrl: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	price: bigint({ mode: "number" }).notNull(),
	type: text().notNull(),
	summary: text().notNull(),
	currency: storeCurrency().notNull(),
	value: text().notNull(),
	command: text(),
}, (table) => [
	check("store_items_id_not_null", sql`NOT NULL id`),
	check("store_items_title_not_null", sql`NOT NULL title`),
	check("store_items_price_not_null", sql`NOT NULL price`),
	check("store_items_type_not_null", sql`NOT NULL type`),
	check("store_items_summary_not_null", sql`NOT NULL summary`),
	check("store_items_value_not_null", sql`NOT NULL value`),
	check("store_items_currency_not_null", sql`NOT NULL currency`),
]);

export const options = pgTable("options", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "options_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	value: boolean().notNull(),
	title: text().notNull(),
}, (table) => [
	check("options_id_not_null", sql`NOT NULL id`),
	check("options_name_not_null", sql`NOT NULL name`),
	check("options_value_not_null", sql`NOT NULL value`),
	check("options_title_not_null", sql`NOT NULL title`),
]);

export const activityUsers = pgTable("activity_users", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	nickname: text().notNull(),
	event: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	type: playerActivityEvent().notNull(),
}, (table) => [
	check("activity_users_id_not_null", sql`NOT NULL id`),
	check("activity_users_nickname_not_null", sql`NOT NULL nickname`),
	check("activity_users_type_not_null", sql`NOT NULL type`),
	check("activity_users_event_not_null", sql`NOT NULL event`),
]);

export const fvItems = pgTable("fv_items", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "fv_items_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	nickname: text().notNull(),
	itemId: integer("item_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("fv_items_id_not_null", sql`NOT NULL id`),
	check("fv_items_nickname_not_null", sql`NOT NULL nickname`),
	check("fv_items_item_id_not_null", sql`NOT NULL item_id`),
	check("fv_items_created_at_not_null", sql`NOT NULL created_at`),
]);

export const roles = pgTable("roles", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
}, (table) => [
	check("roles_name_not_null", sql`NOT NULL name`),
	check("roles_id_not_null", sql`NOT NULL id`),
]);

export const permissions = pgTable("permissions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "permissions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
}, (table) => [
	unique("permissions_name_key").on(table.name),
	check("permissions_id_not_null", sql`NOT NULL id`),
	check("permissions_name_not_null", sql`NOT NULL name`),
]);

export const paymentMethods = pgTable("payment_methods", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "payment_methods_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	value: text().notNull(),
	description: text(),
	imageUrl: text().notNull(),
	isAvailable: boolean().default(true).notNull(),
}, (table) => [
	check("payment_methods_id_not_null", sql`NOT NULL id`),
	check("payment_methods_title_not_null", sql`NOT NULL title`),
	check("payment_methods_value_not_null", sql`NOT NULL value`),
	check("payment_methods_imageUrl_not_null", sql`NOT NULL "imageUrl"`),
	check("payment_methods_isAvailable_not_null", sql`NOT NULL "isAvailable"`),
]);

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
	check("banners_views_nickname_not_null", sql`NOT NULL nickname`),
	check("banners_views_id_not_null", sql`NOT NULL id`),
]);

export const banners = pgTable("banners", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "banners_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	description: text(),
	hrefTitle: text("href_title").notNull(),
	hrefValue: text("href_value").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	check("banners_id_not_null", sql`NOT NULL id`),
	check("banners_title_not_null", sql`NOT NULL title`),
	check("banners_href_title_not_null", sql`NOT NULL href_title`),
	check("banners_href_value_not_null", sql`NOT NULL href_value`),
	check("banners_created_at_not_null", sql`NOT NULL created_at`),
]);

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
	check("users_id_not_null", sql`NOT NULL id`),
	check("users_nickname_not_null", sql`NOT NULL nickname`),
	check("users_role_id_not_null", sql`NOT NULL role_id`),
	check("players_created_at_not_null", sql`NOT NULL created_at`),
	check("players_uuid_not_null", sql`NOT NULL uuid`),
	check("players_lowercasenickname_not_null", sql`NOT NULL lower_case_nickname`),
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
}, (table) => [
	check("tasks_id_not_null", sql`NOT NULL id`),
	check("tasks_title_not_null", sql`NOT NULL title`),
	check("tasks_description_not_null", sql`NOT NULL description`),
	check("tasks_reward_value_not_null", sql`NOT NULL reward_value`),
	check("tasks_reward_currency_not_null", sql`NOT NULL reward_currency`),
	check("tasks_created_at_not_null", sql`NOT NULL created_at`),
	check("tasks_action_type_not_null", sql`NOT NULL action_type`),
]);

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
	check("role_permissions_role_id_not_null", sql`NOT NULL role_id`),
	check("role_permissions_permission_id_not_null", sql`NOT NULL permission_id`),
]);

export const activityHeatmap = pgTable("activity_heatmap", {
	date: date().notNull(),
	hour: integer().notNull(),
	activePlayers: integer("active_players").notNull(),
}, (table) => [
	primaryKey({ columns: [table.date, table.hour], name: "constraint_1"}),
	check("activity_heatmap_date_not_null", sql`NOT NULL date`),
	check("activity_heatmap_hour_not_null", sql`NOT NULL hour`),
	check("activity_heatmap_active_players_not_null", sql`NOT NULL active_players`),
]);
