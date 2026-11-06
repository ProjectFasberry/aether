import Elysia from "elysia";
import type { CreateOrderRoutePayload } from "@repo/shared/types/entities/payment"
import { defineRequiredUser } from "#/lib/define";
import { cartItem } from "../../cart/cart.model";
import { findGameOrder, initialPrices, processStoreGamePurchase } from "./order-game.model";
import { getWallet } from "#/modules/economy/wallet.model";
import { charism, CHARISM_SERVERS } from "#/modules/economy/charism";
import { t } from "elysia";
import type { GameCurrency } from "@repo/shared/schemas/store/payment";
import { withError } from "#/shared/schemas";
import { nanoid } from "nanoid";
import { wrapError } from "@repo/shared/lib/helpers"

const ERRORS_MAP: Record<string, string> = {
  "TIMEOUT": "Похоже игровой сервер не доступен"
}

export const createOrder = new Elysia()
  .use(defineRequiredUser())
  .post('/create', async ({ nickname: initiator, status, body }) => {
    const server = body?.server ?? "bisquite";
    const provider = charism.get(server);

    if (!provider?.purchasable()) {
      return status(400, wrapError("SERVER_NOT_PURCHASABLE"))
    }

    const items = await cartItem.getList(initiator);

    if (items.length === 0) {
      return status(400, wrapError("items-not-found"))
    }

    const finishPrice = items.reduce((acc, item) => {
      const { currency, price } = item;
      const amount = parseFloat(price);

      if (currency in acc) {
        acc[currency] += amount;
      } else {
        acc[currency] = amount;
      }

      return acc;
    }, { ...initialPrices });

    const balance = await getWallet(initiator);

    if (
      balance.BELKOIN < finishPrice.BELKOIN
      || balance.CHARISM < finishPrice.CHARISM
    ) {
      return status(400, wrapError("insufficient"))
    }

    try {
      // A client retry reuses the key, so the server never charges twice.
      const uniqueId = body?.idempotencyKey ?? nanoid(9);
      const existing = await findGameOrder(uniqueId, initiator);

      if (existing) {
        const price: Record<GameCurrency, number> = {
          BELKOIN: Number(finishPrice.BELKOIN ?? 0),
          CHARISM: Number(finishPrice.CHARISM ?? 0),
        };

        return {
          data: {
            purchase: { uniqueId },
            payload: { price },
          } satisfies CreateOrderRoutePayload,
        };
      }

      const products = items.map(target => ({
        ...target,
        recipient: target.recipient,
      }));

      const result = await processStoreGamePurchase({
        initiator,
        uniqueId,
        products,
        finishPrice: finishPrice as Record<GameCurrency, number>,
        server,
      });

      if (result.error) {
        return status(400, wrapError(result.error))
      }

      const price: Record<GameCurrency, number> = {
        BELKOIN: Number(finishPrice.BELKOIN ?? 0),
        CHARISM: Number(finishPrice.CHARISM ?? 0),
      }

      const data: CreateOrderRoutePayload = {
        purchase: {
          uniqueId
        },
        payload: {
          price
        }
      };

      return { data }
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
      400: withError(),
    }
  })
