import { donateSchema, type Donate } from "@repo/shared/types/entities/donate";

/**
 * LuckPerms may contain unknown or stale groups; the API contract only allows
 * the known donate list, so anything else falls back to the default group.
 */
export function resolveDonateGroup(value: string | null | undefined): Donate {
  const parsed = donateSchema.safeParse(value?.toLowerCase())

  return parsed.success ? parsed.data : "default"
}
