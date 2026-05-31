import { invariant } from "#/helpers/invariant";
import { client } from "#/shared/api/client";
import { env } from "#/shared/env";
import type { OrderInputPayload, OutputPayload } from "@repo/shared/schemas/store/payment";

const heleketClient = client.extend((opts) => ({
  ...opts,
  baseUrl: "https://api.heleket.com",
  headers: {
    "merchant": env.HELEKET_MERCHANT_KEY,
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
