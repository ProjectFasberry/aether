import { getOrderKey } from "./create-crypto-order";
import { redis } from "#/shared/redis/client";
import { general } from "#/shared/database/general-db";
import { type Static, t } from "elysia";
import { safeJsonParse } from "#/utils";

export const orderStatusSchema = t.UnionEnum(["pending", "succeeded", "all"], { default: "all" })
const orderAssetSchema = t.UnionEnum(["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC"])

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

type OrdersSingleDefault = Static<typeof orderDefaultSingleSchema>;
type OrdersAll = Static<typeof orderDefaultSingleSchema>;
type OrdersDefault = Static<typeof orderDefaultSingleSchema>;
type OrdersSingle = Static<typeof orderDefaultSingleSchema>;

type ExternalOrderParams = {
  initiator: string, status: Static<typeof orderStatusSchema>
};

type OrderAsset = Static<typeof orderAssetSchema>;

export const externalOrders = {
  async getCache(uniqueId: string): Promise<OrdersSingleDefault | null> {
    const redisClient = redis.getInstance()
    const key = getOrderKey(uniqueId);

    const dataStr = await redisClient.get(key);
    if (!dataStr) return null;

    const result = safeJsonParse<OrdersSingleDefault>(dataStr);
    if (!result.ok) return null;

    return result.value;
  },
  async getPersist(uniqueId: string): Promise<OrdersSingleDefault | null> {
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
  async getAllOrders({ initiator, status }: ExternalOrderParams): Promise<OrdersAll[]> {
    const [defaultData, cachedOrders] = await Promise.all([
      externalOrders.getDefault({ initiator, status }),
      externalOrders.getCachedOrders({ initiator }),
    ]);

    return [...cachedOrders, ...defaultData];
  },
  async getSingle(uniqueId: string): Promise<OrdersSingle | null> {
    const cache = await externalOrders.getCache(uniqueId);
    if (cache) return cache;
    const data = await externalOrders.getPersist(uniqueId);
    return data;
  },
  async getCachedOrders({ initiator }: { initiator: string }): Promise<OrdersDefault[]> {
    const redisClient = redis.getInstance()
    const keys = await redisClient.smembers(`index:initiator:${initiator}`);

    const orders: OrdersSingleDefault[] = await Promise.all(
      keys.map((key) => redisClient.get(key).then((value) => JSON.parse(value!))),
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
