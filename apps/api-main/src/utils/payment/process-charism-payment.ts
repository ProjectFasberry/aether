import { callBroadcast } from "../server/call-broadcast"
import { callServerCommand } from "../server/call-command"

type GiveCharism = { nickname: string, value: number }

async function giveCharism(
  { nickname, value }: GiveCharism,
) {
  const payload = { parent: "cmi", value: `money give ${nickname} ${value}` } as const

  return callServerCommand(payload)
}

export async function processCharismPayment({
  nickname, value
}: { nickname: string, value: number }) {
  const message = `Игрок ${nickname} приобрел ${value} ед. харизмы`

  await giveCharism({ nickname, value });
  await callServerCommand({ parent: "cmi", value: `toast ${nickname} Поздравляем с покупкой` });
  await callBroadcast({ message });
}