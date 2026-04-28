import { getOrderKey } from "./create-crypto-order";
import { getRedis } from "#/shared/redis/init";
import { safeJsonParse } from "#/utils/config/transforms";
import { general } from "#/shared/database/general-db";
import { type Static, t } from "elysia";

const orderStatusSchema = t.UnionEnum(["pending", "succeeded", "all"])
const orderAssetSchema = t.UnionEnum(["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC"])
type OrderStatus = Static<typeof orderStatusSchema>;
type OrderAsset = Static<typeof orderAssetSchema>;

export const orderDefaultSingleSchema = t.Object({
	unique_id: t.String(),
	asset: orderAssetSchema,
	price: t.String(),
	created_at: t.String(),
	status: t.UnionEnum(["canceled", "pending", "succeeded", "waitingForCapture"]),
	payload: t.String(),
	order_id: t.String(),
	invoice_id: t.Number(),
	pay_url: t.String(),
	initiator: t.String(),
	comment: t.Nullable(t.String())
})

type OrderSingleDefault = Static<typeof orderDefaultSingleSchema>;
type Orders = Static<typeof orderDefaultSingleSchema>;
type OrdersDefault = Static<typeof orderDefaultSingleSchema>;

type ExternalOrderParams = { initiator: string, status: OrderStatus };

export const externalOrders = {
	async getCache(uniqueId: string): Promise<OrderSingleDefault | null> {
		const redis = getRedis();
		const key = getOrderKey(uniqueId);

		const dataStr = await redis.get(key);
		if (!dataStr) return null;

		const result = safeJsonParse<OrderSingleDefault>(dataStr);
		if (!result.ok) return null;

		return result.value;
	},
	async getPersist(uniqueId: string): Promise<OrderSingleDefault | null> {
		const data = await general
			.selectFrom("payments")
			.select([
				"created_at", "order_id", "price", "status", "payload", "unique_id",
				"pay_url", "invoice_id", "asset", "initiator", "comment",
			])
			.where("unique_id", "=", uniqueId)
			.$narrowType<{ asset: OrderAsset }>()
			.executeTakeFirst();

		if (!data) return null;

		return {
			...data,
			created_at: data.created_at.toString()
		}
	},
	async getAllOrders({ initiator, status }: ExternalOrderParams): Promise<Orders[]> {
		const [defaultData, cachedOrders] = await Promise.all([
			externalOrders.getDefault({ initiator, status }),
			externalOrders.getCachedOrders({ initiator }),
		]);

		return [...cachedOrders, ...defaultData];
	},
	async getSingle(uniqueId: string): Promise<Static<typeof orderDefaultSingleSchema> | null> {
		const cache = await externalOrders.getCache(uniqueId);
		if (cache) return cache;
		const data = await externalOrders.getPersist(uniqueId);
		return data;
	},
	async getCachedOrders({ initiator }: { initiator: string }): Promise<OrdersDefault[]> {
		const redis = getRedis();
		const keys = await redis.smembers(`index:initiator:${initiator}`);

		const orders: OrderSingleDefault[] = await Promise.all(
			keys.map((key) => redis.get(key).then((value) => JSON.parse(value!))),
		);

		return orders.map((d) => ({ ...d, type: "default" }));
	},
	async getDefault({ initiator, status }: ExternalOrderParams): Promise<OrdersDefault[]> {
		const ordersStatus = status === "all" ? null : status;

		let query = general
			.selectFrom("payments")
			.select([
				"unique_id", "asset", "price", "created_at", "status", "payload", "order_id",
				"invoice_id", "pay_url", "initiator", "comment",
			])
			.$narrowType<{ asset: OrderAsset }>()
			.where("initiator", "=", initiator);

		if (ordersStatus) {
			query = query.where("status", "=", ordersStatus);
		}

		const data = await query.execute()
		return data.map((row) => ({ ...row, created_at: row.created_at.toString() }))
	}
}