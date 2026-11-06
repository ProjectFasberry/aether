import { DateTime } from "#/helpers/typebox";
import { general } from "#/shared/database/general-db";
import { type Static, t } from "elysia";
import { sql, type Kysely } from "kysely";

export const ORDER_SORTS = ["date", "amount"] as const;
export const ORDER_DIRECTIONS = ["asc", "desc"] as const;

export type OrderSort = typeof ORDER_SORTS[number];
export type OrderDirection = typeof ORDER_DIRECTIONS[number];

export type GameOrderCursor = {
	sort: OrderSort;
	value: string | number;
	id: number;
};

export function encodeGameOrderCursor(cursor: GameOrderCursor): string {
	return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeGameOrderCursor(value: string): GameOrderCursor | null {
	try {
		const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<GameOrderCursor>;

		if (parsed.sort !== "date" && parsed.sort !== "amount") return null;
		if (typeof parsed.id !== "number" || !Number.isInteger(parsed.id)) return null;
		if (parsed.sort === "date" && (typeof parsed.value !== "string" || Number.isNaN(Date.parse(parsed.value)))) return null;
		if (parsed.sort === "amount" && typeof parsed.value !== "number") return null;

		return parsed as GameOrderCursor;
	} catch {
		return null;
	}
}

export const orderGameSchema = t.Object({
	unique_id: t.String(),
	initiator: t.String(),
	created_at: DateTime,
	finished_at: t.Nullable(DateTime),
	status: t.UnionEnum(["pending", "succeeded", "refunded"]),
	price: t.Any(),
	items_count: t.Number(),
});

export const orderSingleGameSchema = t.Object({
	initiator: t.String(),
	unique_id: t.String(),
	created_at: DateTime,
	finished_at: t.Nullable(DateTime),
	status: t.UnionEnum(["pending", "succeeded", "refunded"]),
	price: t.Any(),
	items: t.Array(
		t.Object({
			id: t.Number(),
			store_item_id: t.Number(),
			name: t.String(),
			recipient: t.String(),
			delivery_status: t.Optional(t.String()),
			revoked_at: t.Optional(t.Nullable(DateTime)),
		}),
	),
});

type OrdersGame = Static<typeof orderGameSchema>;

/** `price`/pagination columns are newer than the generated schema. */
const db = general as unknown as Kysely<any>;

const amountExpr = sql<number>`coalesce(("payments_game"."price"->>'BELKOIN')::bigint, 0) + coalesce(("payments_game"."price"->>'CHARISM')::bigint, 0)`;
const itemsCountExpr = sql<number>`(select count(*) from "payments_game_childs" c where c."order_id" = "payments_game"."unique_id")`;

export type GameOrdersPage = {
	data: OrdersGame[];
	meta: { hasNextPage: boolean; endCursor?: string };
};

export const internalOrders = {
	async getGameOrders({
		initiator,
		sort = "date",
		order = "desc",
		status,
		cursor,
		limit = 20,
	}: {
		initiator: string;
		sort?: OrderSort;
		order?: OrderDirection;
		status?: "pending" | "succeeded" | "refunded";
		cursor?: GameOrderCursor | null;
		limit?: number;
	}): Promise<GameOrdersPage> {
		const direction = order === "asc" ? "asc" : "desc";

		let query = db
			.selectFrom("payments_game")
			.select([
				"payments_game.id",
				"payments_game.unique_id",
				"payments_game.initiator",
				"payments_game.created_at",
				"payments_game.finished_at",
				"payments_game.refunded_at",
				"payments_game.price",
				itemsCountExpr.as("items_count"),
				sql<OrdersGame["status"]>`case
					when "payments_game"."refunded_at" is not null then 'refunded'
					when "payments_game"."finished_at" is null then 'pending'
					else 'succeeded'
				end`.as("status"),
			])
			.where("payments_game.initiator", "=", initiator)
			// Pre-ledger orders have an empty price and no purchase entry. Keep
			// new free orders: they still carry the currency keys in `price`.
			.where((eb: any) => eb.or([
				eb("payments_game.price", "<>", sql`'{}'::jsonb`),
				eb.exists(
					eb.selectFrom("ledger_entries as le")
						.select("le.id")
						.whereRef("le.order_id", "=", "payments_game.unique_id")
						.where("le.reason", "like", "store.purchase:%"),
				),
			]))
			.limit(limit + 1);

		if (status === "pending") {
			query = query
				.where("payments_game.finished_at", "is", null)
				.where("payments_game.refunded_at", "is", null);
		}
		if (status === "succeeded") {
			query = query
				.where("payments_game.finished_at", "is not", null)
				.where("payments_game.refunded_at", "is", null);
		}
		if (status === "refunded") query = query.where("payments_game.refunded_at", "is not", null);

		if (sort === "amount") {
			query = query
				.orderBy(amountExpr, direction)
				.orderBy("payments_game.id", direction);
		} else {
			query = query
				.orderBy("payments_game.created_at", direction)
				.orderBy("payments_game.id", direction);
		}

		if (cursor) {
			if (cursor.sort === "date") {
				const createdAt = new Date(cursor.value as string);
				const comparator = direction === "asc" ? ">" : "<";

				query = query.where(
					sql<boolean>`(
						"payments_game"."created_at" ${sql.raw(comparator)} ${createdAt}
						or ("payments_game"."created_at" = ${createdAt} and "payments_game"."id" ${sql.raw(comparator)} ${cursor.id})
					)`,
				);
			} else {
				const comparator = direction === "asc" ? ">" : "<";

				query = query.where(
					sql<boolean>`(
						${amountExpr} ${sql.raw(comparator)} ${cursor.value}
						or (${amountExpr} = ${cursor.value} and "payments_game"."id" ${sql.raw(comparator)} ${cursor.id})
					)`,
				);
			}
		}

		const rows = await query.execute() as unknown as {
			unique_id: string;
			initiator: string;
			created_at: Date;
			finished_at: Date | null;
			refunded_at: Date | null;
			price: Record<string, number>;
			items_count: number;
			status: OrdersGame["status"];
			id: number;
		}[];

		const hasNextPage = rows.length > limit;
		if (hasNextPage) rows.pop();

		const last = rows[rows.length - 1];

		return {
			data: rows.map((row) => ({
				unique_id: row.unique_id,
				initiator: row.initiator,
				created_at: row.created_at,
				finished_at: row.finished_at,
				status: row.status,
				price: row.price ?? {},
				items_count: Number(row.items_count),
			})),
			meta: {
				hasNextPage,
				endCursor: last
					? encodeGameOrderCursor({
						sort,
						value: sort === "date" ? new Date(last.created_at).toISOString() : Number((last.price?.BELKOIN ?? 0) + (last.price?.CHARISM ?? 0)),
						id: last.id,
					})
					: undefined,
			},
		};
	},

	async getGameOrder(uniqueId: string): Promise<Static<typeof orderSingleGameSchema> | null> {
		const [order, orderChilds] = await Promise.all([
			db
				.selectFrom("payments_game")
				.select(["unique_id", "created_at", "finished_at", "refunded_at", "initiator", "price"])
				.where("unique_id", "=", uniqueId)
				.executeTakeFirst(),
			db
				.selectFrom("payments_game_childs")
				.select(["store_item_id", "recipient", "delivery_status", "revoked_at"])
				.where("order_id", "=", uniqueId)
				.execute(),
		]);

		if (!order) return null;

		const storeItems = await db
			.selectFrom("store_items")
			.select(["id", "title as name"])
			.where(
				"id",
				"in",
				orderChilds.map((oc) => oc.store_item_id),
			)
			.orderBy("id", "asc")
			.execute();

		const storeItemMap = new Map(storeItems.map((si) => [si.id, si.name]));

		return {
			unique_id: order.unique_id,
			created_at: order.created_at,
			finished_at: order.finished_at,
			status: order.refunded_at ? "refunded" : order.finished_at ? "succeeded" : "pending",
			price: order.price ?? {},
			initiator: order.initiator,
			items: orderChilds.map((oc) => ({
				id: oc.store_item_id,
				store_item_id: oc.store_item_id,
				name: storeItemMap.get(oc.store_item_id) ?? "Товар удалён",
				recipient: oc.recipient,
				delivery_status: oc.delivery_status,
				revoked_at: oc.revoked_at,
			})),
		};
	},
};
