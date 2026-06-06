import { callBroadcast } from "../server/call-broadcast"
import { callServerCommand } from "../server/call-command";

type GiveBelkoin = {
  nickname: string,
  value: number
}

async function giveBelkoin(
  { nickname, value }: GiveBelkoin,
) {
  const payload = { parent: "p", value: `give ${nickname} ${value}`, } as const;;
  return callServerCommand(payload)
}

export async function processBelkoinPayment({
  nickname, value
}: { nickname: string, value: number }) {
  const message = `Игрок ${nickname} приобрел ${value} ед. белкоинов`
  const command = { parent: "cmi", value: `toast ${nickname} Поздравляем c покупкой!` } as const;

  await giveBelkoin({ nickname, value });
  await callServerCommand({ ...command });
  await callBroadcast({ message });
}