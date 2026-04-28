import Elysia from "elysia";
import type { CreateOrderRoutePayload } from "@repo/shared/types/entities/payment"
import { defineUser } from "#/lib/middlewares/define";
import { wrapError } from "#/helpers/wrap-error";
import { cartItem } from "../../cart/cart.model";
import { createGamePaymentRecord, initialPrices, processStoreGamePurchase, updateGamePaymentRecord } from "./order-game.model";
import { defineGlobalPrice } from "#/utils/store/store-helpers";
import type { GameCurrency } from "@repo/shared/schemas/payment";
import { withError } from "#/shared/schemas";
import { getBalance } from "#/modules/user/balance.model";
import { nanoid } from "nanoid";

const ERRORS_MAP: Record<string, string> = {
  "TIMEOUT": "Похоже игровой сервер не доступен"
}

export const createOrder = new Elysia()
  .use(defineUser())
  .post('/create', async ({ nickname: initiator, status }) => {
    const [balance, finalPrice] = await Promise.all([
      getBalance(initiator, { server: "bisquite" }),
      defineGlobalPrice(initiator)
    ])

    if (
      balance.BELKOIN < finalPrice.BELKOIN
      || balance.CHARISM < finalPrice.CHARISM
    ) {
      return status(400, wrapError("insufficient"))
    }

    const items = await cartItem.getList(initiator);

    if (items.length === 0) {
      return status(400, wrapError("items-not-found"))
    }

    const itemsMap = new Map(items.map(item => [item.id, item.recipient]));

    try {
      const finishPrice = items.reduce((acc, item) => {
        const { currency, price } = item;

        if (currency in acc) {
          acc[currency] += parseFloat(price);
        } else {
          acc[currency] = parseFloat(price);
        }

        return acc;
      }, initialPrices);

      const uniqueId = nanoid(9);

      const products = items.map(target => ({
        ...target,
        recipient: itemsMap.get(target.id)!
      }));

      await createGamePaymentRecord(uniqueId, initiator, products)
      
      const result = await processStoreGamePurchase(initiator, finishPrice, products);

      if (result.error) {
        return status(400, wrapError(result.error))
      }

      const { BELKOIN, CHARISM } = finishPrice;

      const price: Record<GameCurrency, number> = {
        BELKOIN: Number(BELKOIN ?? 0),
        CHARISM: Number(CHARISM ?? 0),
      }

      const data: CreateOrderRoutePayload = {
        purchase: { 
          uniqueId 
        },
        payload: { 
          price 
        }
      };

      await updateGamePaymentRecord(uniqueId)

      return { data }
    } catch (e) {
      if (e instanceof Error) {
        const message = ERRORS_MAP[e.message] ?? e.message
        throw status(500, wrapError(message))
      }
    }
  }, {
    response: {
      500: withError,
      400: withError,
    }
  })