/**
 * Short-lived cache for the effective permissions of a player. Every private
 * request would otherwise run a UNION over role and per-player grants; role and
 * grant mutations clear the cache, so the TTL only matters for changes made in
 * another instance.
 */
const TTL_MS = 15_000;
const MAX_ENTRIES = 5_000;

type Entry = { value: Set<string>; expiresAt: number };

const cache = new Map<string, Entry>();

export function permissionCacheKey(nickname: string, roleId: number): string {
  return `${nickname.toLowerCase()}:${roleId}`;
}

export function readPermissions(key: string): Set<string> | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function writePermissions(key: string, value: Set<string>): void {
  if (cache.size >= MAX_ENTRIES) {
    const now = Date.now();

    for (const [cachedKey, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(cachedKey);
    }

    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
  }

  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

/** Call after any role/grant mutation; entries are cheap to rebuild. */
export function clearPermissionCache(): void {
  cache.clear();
}
