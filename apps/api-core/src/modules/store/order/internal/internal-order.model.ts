import { general } from "#/shared/database/general-db";
import { type Static, t } from "elysia";
import { sql } from "kysely";

export const orderGameSchema = t.Object({
  created_at: t.String(),
  initiator: t.String(),
  unique_id: t.String(),
  finished_at: t.Nullable(t.Date()),
  status: t.Literal("succeeded")
})
const orderSingleGameSchema = t.Object({
  initiator: t.String(),
  unique_id: t.String(),
  created_at: t.String(),
  finished_at: t.Nullable(t.String()),
  items: t.Array(
    t.Object({
      id: t.Number(),
      store_item_id: t.Number(),
      name: t.String(),
      recipient: t.String()
    })
  )
})

type OrdersGame = Static<typeof orderGameSchema>;

export const internalOrders = {
  async getGameOrders({ initiator }: { initiator: string }): Promise<OrdersGame[]> {
    const query = await general
      .selectFrom("payments_game")
      .select([
        "unique_id",
        "created_at",
        "finished_at",
        "initiator",
        sql<OrdersGame["status"]>`'succeeded'`.as("status"),
      ])
      .where("initiator", "=", initiator)
      .execute();

    return query.map((row) => ({ ...row, created_at: row.created_at.toString() }));
  },
  async getGameOrder(uniqueId: string): Promise<Static<typeof orderSingleGameSchema> | null> {
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

    const data = {
      unique_id: order.unique_id,
      created_at: order.created_at.toString(),
      finished_at: order.finished_at ? order.finished_at.toString() : null,
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
}