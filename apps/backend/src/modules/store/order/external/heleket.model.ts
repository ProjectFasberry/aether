import { invariant } from "#/helpers/invariant";
import type { OrderInputPayload, OutputPayload } from "@repo/shared/schemas/payment";
import { Heleket } from "heleket-api-sdk";

const MERCHANT_KEY = Bun.env.HELEKET_MERCHANT_KEY;
const PAYMENT_KEY = Bun.env.HELEKET_PAYMENT_KEY;
const PAYOUT_KEY = Bun.env.HELEKET_PAYOUT_KEY;

const heleket = new Heleket(MERCHANT_KEY, PAYMENT_KEY, PAYOUT_KEY);

export async function processStoreCryptoPurchaseHeleket(p: OrderInputPayload): Promise<OutputPayload> {
  const d = heleket.createPayment({
    amount: "0",
    currency: "RUB",
    order_id: "123",
    accuracy_payment_percent: "4",
    additional_data: undefined,
    currencies: undefined,
    is_payment_multiple: undefined,
    except_currencies: undefined,
    lifetime: undefined,
    discount_percent: undefined,
    network: undefined,
    subtract: undefined,
    to_currency: undefined,
    url_callback: undefined,
    url_return: undefined
  })

  invariant(false, 'Not implemented yet')
}
