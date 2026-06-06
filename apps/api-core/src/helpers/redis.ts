import { buildRedisKey } from "@repo/core/utils/redis";

export const getRedisKey = (target: "external" | "internal", name: string) => buildRedisKey({ target, name })
