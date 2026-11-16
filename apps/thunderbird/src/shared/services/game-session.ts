import { redisService } from "#/shared/redis/client";

/**
 * The 24h game session ("second door"): a player who typed the password once
 * may join any launcher without a ticket. Kept in Redis so the proxy gate and
 * the API share it.
 */
const TTL_SECONDS = 24 * 60 * 60;

const key = (nickname: string) => `mc:session:${nickname.toLowerCase()}`;

export async function grantGameSession(nickname: string): Promise<void> {
  await redisService.getInstance().set(key(nickname), "1", "EX", TTL_SECONDS);
}

export async function hasGameSession(nickname: string): Promise<boolean> {
  return (await redisService.getInstance().get(key(nickname))) !== null;
}

/** Drops the session after a password change, a ban or an account deletion. */
export async function revokeGameSession(nickname: string): Promise<void> {
  await redisService.getInstance().del(key(nickname));
}
