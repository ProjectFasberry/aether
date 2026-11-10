import { general } from "../database/general-db"
import { redisService } from "../redis/client"
import { logger } from "@repo/shared/utils/logger"

export const OPTION_NAMES = [
  "registrationEnabled",
  "botCheckEnabled",
  "eventsLogging",
] as const

export type OptionName = (typeof OPTION_NAMES)[number]

const CACHE_TTL_MS = 10_000
const INVALIDATE_CHANNEL = "options:invalidate"

const optionsLogger = logger.child({ name: "options" })
const cache = new Map<OptionName, { value: boolean; expiresAt: number }>()
const inflight = new Map<OptionName, Promise<boolean>>()
const warned = new Set<OptionName>()

let subscribed = false

async function loadOption(option: OptionName): Promise<boolean> {
  const query = await general
    .selectFrom("options")
    .select("value")
    .where("name", "=", option)
    .executeTakeFirst();

  if (!query) {
    if (!warned.has(option)) {
      warned.add(option)
      optionsLogger.warn(`Option "${option}" not found. Fallback: false`)
    }

    return false;
  }

  return query.value;
}

export async function getOption(option: OptionName): Promise<boolean> {
  const cached = cache.get(option)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const pending = inflight.get(option)
  if (pending) return pending

  const request = loadOption(option)
    .then((value) => {
      cache.set(option, { value, expiresAt: Date.now() + CACHE_TTL_MS })
      return value
    })
    .finally(() => inflight.delete(option))

  inflight.set(option, request)
  return request
}

function dropLocal(option?: OptionName): void {
  if (option) {
    cache.delete(option)
    return
  }

  cache.clear()
}

/** Drops the local cache and asks every replica to do the same. */
export async function invalidateOption(option?: OptionName): Promise<void> {
  dropLocal(option)

  try {
    await redisService.getInstance().publish(INVALIDATE_CHANNEL, option ?? "*")
  } catch (e) {
    optionsLogger.warn({ message: "option cache invalidation failed", error: e })
  }
}

export async function setOption(option: OptionName, value: boolean): Promise<boolean> {
  const row = await general
    .updateTable("options")
    .set({ value })
    .where("name", "=", option)
    .returning("value")
    .executeTakeFirst()

  if (!row) throw new Error("OPTION_NOT_FOUND")

  await invalidateOption(option)
  return row.value
}

/** Subscribes the bridge client; must run after Redis is ready. */
export async function initOptionCache(): Promise<void> {
  if (subscribed) return

  const bridge = redisService.getBridgeInstance()
  await bridge.subscribe(INVALIDATE_CHANNEL)

  bridge.on("message", (channel, message) => {
    if (channel !== INVALIDATE_CHANNEL) return

    if (message === "*") {
      dropLocal()
      return
    }

    if (OPTION_NAMES.includes(message as OptionName)) {
      dropLocal(message as OptionName)
    }
  })

  subscribed = true
}
