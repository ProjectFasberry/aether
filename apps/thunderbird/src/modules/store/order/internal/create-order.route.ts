import Elysia from "elysia";
import type { CreateOrderRoutePayload } from "@repo/shared/types/entities/payment"
import { defineRequiredUser } from "#/lib/define";
import { cartItem } from "../../cart/cart.model";
import { findGameOrder, processStoreGamePurchase } from "./order-game.model";
import {
  deliveryLockKeys,
  partitionProducts,
  sumProductsPrice,
  type SkippedItem,
} from "./delivery-dedup";
import {
  checkProductsDuplicates,
  withDeliveryLocks,
} from "./delivery-dedup-db";
import { getOrderEntries, getWallet } from "#/modules/economy/wallet.model";
import { charism, CHARISM_SERVERS } from "#/modules/economy/charism";
import { t } from "elysia";
import type { GameCurrency } from "@repo/shared/schemas/store/payment";
import { withError } from "#/shared/schemas";
import { nanoid } from "nanoid";
import { wrapError } from "@repo/shared/lib/helpers"

const ERRORS_MAP: Record<string, string> = {
  "TIMEOUT": "Похоже игровой сервер не доступен"
}

type CartLine = {
  id: number;
  currency: string;
  price: string;
  type: string;
  value: string;
  title: string;
  recipient: string;
  command: string | null;
  refund_cmd: string | null;
};

export const createOrder = new Elysia()
  .use(defineRequiredUser())
  .post('/create', async ({ nickname: initiator, status, body }) => {
    const server = body?.server ?? "bisquite";
    const provider = charism.get(server);

    if (!provider?.purchasable()) {
      return status(400, wrapError("SERVER_NOT_PURCHASABLE"))
    }

    // A retry must find the earlier order before the cart is touched: the
    // first attempt already removed the selected rows.
    const uniqueId = body?.idempotencyKey ?? nanoid(9);
    const existing = await findGameOrder(uniqueId, initiator);

    if (existing) {
      const stored = existing.price as Record<string, number> | null;
      const hasStored = stored && Object.keys(stored).length > 0;
      const price: Record<GameCurrency, number> = {
        BELKOIN: Number(stored?.BELKOIN ?? 0),
        CHARISM: Number(stored?.CHARISM ?? 0),
      };

      if (!hasStored) {
        const entries = await getOrderEntries(uniqueId);

        for (const entry of entries) {
          if (!entry.reason.startsWith("store.purchase:")) continue;

          const currency = entry.currency as GameCurrency;
          if (currency in price) price[currency] += Math.abs(Number(entry.delta));
        }
      }

      return {
        data: {
          purchase: { uniqueId },
          payload: { price },
        } satisfies CreateOrderRoutePayload,
      };
    }

    const items = await cartItem.getList(initiator) as CartLine[];

    if (items.length === 0) {
      return status(400, wrapError("items-not-found"))
    }

    const products = items.map((target: CartLine) => ({
      ...target,
      recipient: target.recipient,
      command: target.command ?? null,
      refundCmd: target.refund_cmd ?? null,
    }));

    type CheckoutResult =
      | { ok: true; data: CreateOrderRoutePayload }
      | { ok: false; error: string; skipped: SkippedItem[] };

    try {
      // The same lock is taken again at delivery, so a duplicate cannot slip
      // between the check and the LuckPerms write.
      const result = await withDeliveryLocks(deliveryLockKeys(products), async (): Promise<CheckoutResult> => {
        const dedup = await checkProductsDuplicates(products);
        const { deliverable, skipped } = partitionProducts(products, dedup);

        if (deliverable.length === 0) {
          return { ok: false, error: "ITEMS_ALREADY_OWNED", skipped };
        }

        const finishPrice = sumProductsPrice(deliverable);
        const balance = await getWallet(initiator);

        if (
          balance.BELKOIN < finishPrice.BELKOIN
          || balance.CHARISM < finishPrice.CHARISM
        ) {
          return { ok: false, error: "insufficient", skipped: [] };
        }

        const purchase = await processStoreGamePurchase({
          initiator,
          uniqueId,
          products,
          finishPrice,
          server,
          dedup,
        });

        if (purchase.error) {
          return { ok: false, error: purchase.error, skipped };
        }

        return {
          ok: true,
          data: {
            purchase: { uniqueId },
            payload: { price: finishPrice },
            skipped,
          },
        };
      });

      if (!result.ok) {
        if (result.error === "ITEMS_ALREADY_OWNED") {
          return status(400, { error: result.error, skipped: result.skipped });
        }

        return status(400, wrapError(result.error));
      }

      return { data: result.data };
    } catch (e) {
      if (e instanceof Error) {
        const message = ERRORS_MAP[e.message] ?? e.message
        throw status(500, wrapError(message))
      }
    }
  }, {
    body: t.Optional(t.Object({
      server: t.Optional(t.UnionEnum(CHARISM_SERVERS)),
      idempotencyKey: t.Optional(t.String({ minLength: 8, maxLength: 64, pattern: "^[A-Za-z0-9_-]+$" })),
    })),
    response: {
      500: withError(),
      400: t.Object({
        error: t.String(),
        skipped: t.Optional(t.Array(t.Object({
          id: t.Number(),
          title: t.String(),
          recipient: t.String(),
          reason: t.UnionEnum(["PERMISSION_ALREADY_PRESENT"]),
        }))),
      }),
    }
  })
