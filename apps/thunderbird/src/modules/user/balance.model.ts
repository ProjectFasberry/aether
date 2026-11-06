import { charism } from "#/modules/economy/charism/model"
import { getBalance as getWalletBalance } from "#/modules/economy/wallet.model"
import * as z from "zod"

export async function getBelkoin(nickname: string) {
  return getWalletBalance(nickname, "BELKOIN")
}

type Server = z.infer<typeof balanceSchema>["server"]

/**
 * Charisma is per server behind the `CharismProvider` contract; Belkoin is
 * global. The response carries the server flags so the client can hide a
 * server that has no readable balance yet.
 */
export async function getBalance(nickname: string, { server }: z.infer<typeof balanceSchema>): Promise<{
  CHARISM: number;
  BELKOIN: number;
  server: Server;
  available: boolean;
  purchasable: boolean;
}> {
  const provider = charism.get(server);
  const [charismBalance, belkoin] = await Promise.all([
    charism.balance(server, nickname),
    getBelkoin(nickname),
  ])

  return {
    CHARISM: Number(charismBalance ?? 0),
    BELKOIN: Number(belkoin),
    server,
    available: Boolean(provider?.available()),
    purchasable: Boolean(provider?.purchasable()),
  }
}

export const balanceSchema = z.object({
  server: z.enum(["muffin", "bisquite"])
})
