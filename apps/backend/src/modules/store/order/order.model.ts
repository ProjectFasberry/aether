import { executeSaga, type TransactionalTask } from "#/utils/config/saga";
import { callServerCommand } from "#/utils/server/call-command";
import { GAME_CURRENCIES, type GameCurrency } from "@repo/shared/schemas/payment";
import { getOrderKey } from "./create-crypto-order";
import { processDonatePayment } from "#/utils/payment/process-donate-payment";
import { getRedis } from "#/shared/redis/init";
import type * as z from "zod/v4";
import { safeJsonParse } from "#/utils/config/transforms";
import type { StoreCurrency } from "@repo/shared/types/db/general-database-types";
import type {
	OrderAsset,
	Orders,
	OrdersDefault,
	OrdersGame,
	OrderSingle,
	OrderSingleGamePayload,
	OrderStatus,
	OrderType,
	OrderSingleDefault,
} from "@repo/shared/types/entities/store";
import { general } from "#/shared/database/general-db";
import { sql } from "kysely";
import type { ordersRouteSchema } from "@repo/shared/schemas/store";
import { logger } from "#/utils/config/logger";

async function getGameOrder(uniqueId: string) {
	const [order, orderChilds] = await Promise.all([
		general
			.selectFrom("payments_game")
			.select(["unique_id", "created_at", "finished_at", "initiator"])
			.where("unique_id", "=", uniqueId)
			.executeTakeFirst(),
		general
			.selectFrom("payments_game_childs")
			.select(["store_item_id", "recipient"])
			.where("order_id", "=", uniqueId)
			.execute(),
	]);

	if (!order) return null;

	const storeItems = await general
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

	const data: OrderSingleGamePayload = {
		unique_id: order.unique_id,
		created_at: order.created_at,
		finished_at: order.finished_at,
		initiator: order.initiator,
		items: orderChilds.map((oc) => ({
			id: oc.store_item_id,
			store_item_id: oc.store_item_id,
			name: storeItemMap.get(oc.store_item_id)!,
			recipient: oc.recipient,
		})),
	};

	return data;
}

async function getOrderS(uniqueId: string) {
	async function getCache(): Promise<OrderSingleDefault | null> {
		const redis = getRedis();
		const key = getOrderKey(uniqueId);

		const dataStr = await redis.get(key);
		if (!dataStr) return null;

		const result = safeJsonParse<OrderSingleDefault>(dataStr);
		if (!result.ok) return null;

		const data = result.value;
		return data;
	}

	async function getPersist(): Promise<OrderSingleDefault | null> {
		const data = await general
			.selectFrom("payments")
			.select([
				"created_at",
				"order_id",
				"price",
				"status",
				"payload",
				"unique_id",
				"pay_url",
				"invoice_id",
				"asset",
				"initiator",
				"comment",
			])
			.where("unique_id", "=", uniqueId)
			.$narrowType<{ asset: OrderAsset }>()
			.executeTakeFirst();

		return data ?? null;
	}

	return { getPersist, getCache };
}

export async function getOrder(uniqueId: string, type: Exclude<OrderType, "all">): Promise<OrderSingle | null> {
	if (type === "game") return getGameOrder(uniqueId);

	if (type === "default") {
		const { getCache, getPersist } = await getOrderS(uniqueId);

		const cache = await getCache();
		if (cache) return cache;

		const data = await getPersist();
		return data;
	}

	throw new Error("Invalid order type");
}

export async function getGameOrders(): Promise<OrdersGame[]> {
	const query = await general
		.selectFrom("payments_game")
		.select([
			"unique_id",
			"created_at",
			"finished_at",
			"initiator",
			sql<OrdersGame["type"]>`'game'`.as("type"),
			sql<OrdersGame["status"]>`'succeeded'`.as("status"),
		])
		.execute();

	return query;
}

export async function getDefaultOrders(initiator: string, status: OrderStatus) {
	const redis = getRedis();
	const ordersStatus = status === "all" ? null : status;

	async function getCachedOrders(): Promise<OrdersDefault[]> {
		const keys = await redis.smembers(`index:initiator:${initiator}`);

		const orders: OrderSingleDefault[] = await Promise.all(
			keys.map((key) => redis.get(key).then((value) => JSON.parse(value!))),
		);

		return orders.map((d) => ({ ...d, type: "default" as const }));
	}

	async function getDefault(): Promise<OrdersDefault[]> {
		let query = general
			.selectFrom("payments")
			.select([
				"unique_id",
				"asset",
				"price",
				"created_at",
				"status",
				"payload",
				"order_id",
				"invoice_id",
				"pay_url",
				"initiator",
				"comment",
				sql<OrdersDefault["type"]>`'default'`.as("type"),
			])
			.$narrowType<{ asset: OrderAsset }>()
			.where("initiator", "=", initiator);

		if (ordersStatus) {
			query = query.where("status", "=", ordersStatus);
		}

		return query.execute();
	}

	return { getCachedOrders, getDefault };
}

export async function getOrders(
	initiator: string,
	{ status, type }: z.infer<typeof ordersRouteSchema>,
): Promise<Orders[]> {
	const { getCachedOrders, getDefault } = await getDefaultOrders(initiator, status);

	async function getOrders(cb?: () => Promise<Orders[]>) {
		const [defaultData, cachedOrders, cbOrders] = await Promise.all([getDefault(), getCachedOrders(), cb ? cb() : []]);

		return [...cachedOrders, ...defaultData, ...cbOrders];
	}

	if (status === "pending") return getOrders();

	if (type === "game") return getGameOrders();

	if (type === "all") return getOrders(getGameOrders);

	if (type === "default") return getOrders();

	throw new Error("Invalid order type");
}

//
type TaskItem = {
	type: string;
	value: string;
	recipient: string;
};

function createTasksForItem({ recipient, type, value }: TaskItem): TransactionalTask[] {
	const tasks: TransactionalTask[] = [];

	if (type === "donate") {
		tasks.push(...processDonatePayment({ recipient, type: "donate", value }));
	}

	if (type === "event") {
		tasks.push({
			name: "notify-player",
			execute: (signal) => callServerCommand({ parent: "cmi", value: `toast ${recipient} Поздравляем с покупкой!` }),
		});
	}

	return tasks;
}

export const initialPrices = Object.fromEntries(GAME_CURRENCIES.map((currency) => [currency, 0])) as Record<
	GameCurrency,
	number
>;

type Product = {
	recipient: string;
	id: number;
	price: string;
	type: string;
	value: string;
	currency: StoreCurrency;
	title: string;
};

export async function createGamePaymentRecord(uniqueId: string, initiator: string, products: Product[]) {
	const ids: number[] = [];

	const query = await general.transaction().execute(async (trx) => {
		for (const { recipient, id: store_item_id } of products) {
			const { id } = await trx
				.insertInto("payments_game_childs")
				.values({ recipient, store_item_id, order_id: uniqueId })
				.returningAll()
				.executeTakeFirstOrThrow();

			ids.push(id);
		}

		const payloadOrderItemIds = ids.map((item_id) => ({
			unique_id: uniqueId,
			initiator,
		}));

		await trx.insertInto("payments_game").values(payloadOrderItemIds).executeTakeFirstOrThrow();
	});

	return query;
}

export async function updateGamePaymentRecord(uniqueId: string) {
	const query = await general
		.updateTable("payments_game")
		.set({ finished_at: new Date().toISOString() })
		.where("unique_id", "=", uniqueId)
		.executeTakeFirstOrThrow();

	return query;
}

export async function processStoreGamePurchase(
	initiator: string,
	finishPrice: typeof initialPrices,
	products: Product[],
) {
	try {
		async function execute() {
			const globalTasks: TransactionalTask[] = [];

			const { BELKOIN, CHARISM } = finishPrice;

			if (BELKOIN > 0) {
				const takeBelkoinTask: TransactionalTask = {
					name: "take-belkoin",
					execute: (signal) => callServerCommand({ parent: "p", value: `take ${initiator} ${BELKOIN}` }),
					rollback: (signal) => callServerCommand({ parent: "p", value: `give ${initiator} ${BELKOIN}` }),
				};

				globalTasks.push(takeBelkoinTask);
			}

			if (CHARISM > 0) {
				const takeCharismTask: TransactionalTask = {
					name: "take-charism",
					execute: (signal) => callServerCommand({ parent: "cmi", value: `money take ${initiator} ${CHARISM}` }),
					rollback: (signal) => callServerCommand({ parent: "cmi", value: `money give ${initiator} ${CHARISM} ` }),
				};

				globalTasks.push(takeCharismTask);
			}

			products.forEach((product) => {
				const productTasks = createTasksForItem(product);
				globalTasks.push(...productTasks);
			});

			const results = await executeSaga(globalTasks);
			return results;
		}

		const result = await execute();

		if (result.status === "error") {
			const error = `${result.error instanceof Error ? result.error.message : "Unknown error"}`;
			return { data: null, error };
		}

		return { result };
	} catch (e) {
		logger.withTag("Order").error(e);
		throw e;
	}
}
