import { invariant } from "#/helpers/invariant";
import { client } from "#/shared/api/client";
import { MERCHANT_KEY, PAYMENT_KEY, PAYOUT_KEY } from "#/shared/env";
import type { OrderInputPayload, OutputPayload } from "@repo/shared/schemas/payment";

const heleketClient = client.extend((opts) => ({
  ...opts,
  baseUrl: "https://api.heleket.com",
  headers: {
    "merchant": MERCHANT_KEY,
  },
  method: "post",
  retry: 1
}))

export const heleket = {
  async start(data: OrderInputPayload): Promise<OutputPayload> {
    console.log(data)
    invariant(false, 'Not implemented yet')
  }
}