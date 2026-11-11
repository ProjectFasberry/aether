/**
 * Tiny in-process TTL cache for public lists that every visitor reads. It is
 * per replica and best-effort: entries expire on their own and nothing
 * invalidates them, so only cache data that can be a few seconds stale.
 */
const MAX_ENTRIES = 500;

const store = new Map<string, { value: unknown; expiresAt: number }>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);

  if (hit && hit.expiresAt > now) return hit.value as T;

  const value = await load();

  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (!oldest.done) store.delete(oldest.value);
  }

  store.set(key, { value, expiresAt: now + ttlMs });

  return value;
}

/** Test helper: drops every entry so cases do not see each other. */
export function clearCacheForTests(): void {
  store.clear();
}
