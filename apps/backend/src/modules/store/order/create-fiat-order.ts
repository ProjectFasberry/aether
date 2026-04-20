import { getNats } from "#/shared/nats/client"
import { SUBJECTS } from "#/shared/nats/subjects"
import type { paymentFiatMethodSchema } from "@repo/shared/schemas/payment"
import type * as z from "zod/v4"

type CreateFiatOrder = { 
  nickname: string, 
  paymentValue: string, 
  paymentType: string, 
  type: z.infer<typeof paymentFiatMethodSchema> 
}

type CreateFiatOrderResponse = {
  IsSuccess: boolean,
  ErrorCode: number,
  Data: string,
  ErrorMessage?: string
}

export async function createFiatOrder({
  paymentValue, paymentType, nickname, type
}: CreateFiatOrder) {
  const nc = getNats()

  const payload: CreateFiatOrder = {
    nickname, paymentType, paymentValue: String(paymentValue), type
  }

  const res = await nc.request(
    SUBJECTS.PAYMENT.FIAT, JSON.stringify(payload), { timeout: 10000 }
  )

  const { IsSuccess, ErrorCode, Data, ErrorMessage } = res.json<CreateFiatOrderResponse>()

  return { isSuccess: IsSuccess, errorCode: ErrorCode, data: Data, errorMessage: ErrorMessage }
}