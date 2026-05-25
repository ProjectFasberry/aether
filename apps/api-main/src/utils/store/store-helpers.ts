import { getStaticUrl } from "#/helpers/volume";
import { general } from "#/shared/database/general-db";
import type { GameCurrency } from "@repo/shared/schemas/payment";

export function processImageUrl(target?: string | null) {
  if (!target) {
    return getStaticUrl("icons/adventure_icon.png")
  }

  if (target.includes("https://")) {
    return target;
  }

  return getStaticUrl(target)
}

export function definePrice(currency: string, price: string): number {
  if (typeof price !== "string") {
    throw new Error(`Price must be a string, got ${typeof price}`);
  }

  const value = Number(price);

  if (Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error(`Invalid transformed price for currency "${currency}": ${price}`);
  }

  return value;
}

export function convertRubToTarget(rubPrice: number, exchangeRate: number): number {
  const priceInTargetCurrency = rubPrice / exchangeRate;
  return parseFloat(priceInTargetCurrency.toFixed(8));
}

export async function defineGlobalPrice(initiator: string): Promise<{
  CHARISM: number;
  BELKOIN: number;
}> {
  const query = general
    .selectFrom("store_cart_items")
    .innerJoin("store_items", "store_items.id", "store_cart_items.product_id")
    .select([
      "store_items.currency",
      "store_items.price"
    ])
    .where("store_cart_items.initiator", "=", initiator)
    .where("store_cart_items.selected", "=", true);

  const cartItems = await query.execute()
  if (!cartItems) throw new Error("Cart data is not defined");

  const totals = { BELKOIN: 0, CHARISM: 0 };

  for (const item of cartItems) {
    const amount = Number(item.price);
    const currency = item.currency as GameCurrency
    totals[currency] += amount
  }

  return totals;
}