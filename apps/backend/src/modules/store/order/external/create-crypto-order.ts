import { env } from "#/shared/env";
import { general } from "#/shared/database/general-db";

export const getOrderLink = (uniqueId: string) => `${env.FRONTEND_URL}/store/order/${uniqueId}`
export const getOrderKey = (uniqueId: string) => `order:${uniqueId}`
export const getOrderInitiatorIndexKey = (initiator: string) => `index:initiator:${initiator}`
export const getOrderRateKey = (initiator: string) => `rate:order_limit:${initiator}`

export async function getEconomyByTarget(target: string) {
  return general
    .selectFrom("store_economy")
    .select(["value", "type"])
    .where("type", "=", target)
    .executeTakeFirstOrThrow()
}