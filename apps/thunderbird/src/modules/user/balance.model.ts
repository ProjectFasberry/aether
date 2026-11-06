import { bisquite } from "#/shared/database/bisquite-db"
import { getBalance as getWalletBalance } from "#/modules/economy/wallet.model"
import type { DB as bisquiteDB } from "@gen/db/bisquite"
import type { Kysely } from "kysely"
import * as z from "zod"

/**
 * Charisma still lives per game server. Bisquite is the only server with a
 * charisma database today; Muffin is behind the same interface and switches on
 * in MN-154 without touching callers.
 */
const charismInstanceDb: Record<Server, Kysely<bisquiteDB> | null> = {
  bisquite: bisquite,
  muffin: null
}

export async function getBelkoin(nickname: string) {
  return getWalletBalance(nickname, "BELKOIN")
}

type Server = z.infer<typeof balanceSchema>["server"]

export async function getCharism(nickname: string, server: Server) {
  const db = charismInstanceDb[server];
  if (!db) return 0;

  return getWalletBalance(nickname, "CHARISM")
}

export async function getBalance(nickname: string, { server }: z.infer<typeof balanceSchema>): Promise<{
  CHARISM: number;
  BELKOIN: number;
  server: Server;
}> {
  const [charism, belkoin] = await Promise.all([
    getCharism(nickname, server), getBelkoin(nickname)
  ])

  return {
    CHARISM: Number(charism),
    BELKOIN: Number(belkoin),
    server
  }
}

export const balanceSchema = z.object({
  server: z.enum(["muffin", "bisquite"])
})
