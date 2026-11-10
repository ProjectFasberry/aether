import { appLogger } from "#/shared/constants/logger";
import { general } from "../database/general-db";
import { sleep } from "@repo/shared/utils";

/**
 * Every permission the API checks. This list is the source of truth: missing
 * rows are created in the `permissions` table on boot, so adding a permission
 * is a code change only.
 */
export const PERMISSION_NAMES = [
  "api.keys.control",
  "api.keys.list",
  "banners.create",
  "banners.delete",
  "dictionaries.create",
  "dictionaries.delete",
  "dictionaries.read",
  "dictionaries.update",
  "economy.read",
  "economy.write",
  "events.create",
  "events.delete",
  "history.read",
  "modpacks.create",
  "modpacks.delete",
  "news.create",
  "news.delete",
  "news.update",
  "options.read",
  "options.update",
  "permissions.read",
  "players.auth",
  "players.permission.update",
  "players.read",
  "players.restrict.create",
  "players.restrict.delete",
  "players.role.update",
  "releases.read",
  "roles.read",
  "roles.update",
  "servers.read",
  "servers.update",
  "store.item.create",
  "store.item.delete",
  "store.item.update",
  "store.methods.read",
  "store.methods.update",
  "volume.control",
] as const;

export type Permission = (typeof PERMISSION_NAMES)[number];

type PermissionTree = { [key: string]: string | PermissionTree };

let PERMISSIONS: PermissionTree = Object.freeze({});
let PERMISSION_INDEX = new Map<string, string>();

function freezeTree(node: PermissionTree): PermissionTree {
  for (const value of Object.values(node)) {
    if (typeof value !== "string") freezeTree(value);
  }

  return Object.freeze(node);
}

export function buildPermissionIndex(data: { name: string }[]): Map<string, string> {
  return new Map(data.map(({ name }) => [name.toUpperCase(), name]));
}

export function buildPermissions(data: { name: string; id: number }[]): PermissionTree {
  const result: PermissionTree = {};

  data.forEach(({ name }) => {
    const parts = name.split(".");
    let current = result;

    parts.forEach((part, idx) => {
      const key = part.toUpperCase();

      if (idx === parts.length - 1) {
        current[key] = name;
        return;
      }

      const next = current[key];

      if (!next || typeof next === "string") {
        const created: PermissionTree = {};
        current[key] = created;
        current = created;
        return;
      }

      current = next;
    });
  });

  return result;
}

type PermissionStats = {
  total: number;
  levels: Record<number, number>;
}

export function analyzePermissions(obj: PermissionTree): PermissionStats {
  const stats: PermissionStats = {
    total: 0, levels: {}
  };

  function recurse(current: PermissionTree, level: number) {
    for (const value of Object.values(current)) {
      if (typeof value === "string") {
        stats.total += 1;
        stats.levels[level] = (stats.levels[level] ?? 0) + 1;
        continue;
      }

      recurse(value, level + 1);
    }
  }

  recurse(obj, 1);

  return stats;
}

/**
 * Creates the rows for permissions that exist in code but not in the database.
 * A read-only account cannot insert; the coverage check then decides whether
 * the existing rows are enough.
 */
async function createMissingPermissions(): Promise<void> {
  try {
    await general
      .insertInto("permissions")
      .values(PERMISSION_NAMES.map((name) => ({ name })))
      .onConflict((oc) => oc.column("name").doNothing())
      .execute();
  } catch (error) {
    appLogger.warn({ message: "Permission sync failed; checking existing rows", error });
  }
}

/** Fails when a permission from the code catalog has no row in the database. */
async function loadPermissions() {
  const rows = await general
    .selectFrom("permissions")
    .selectAll()
    .orderBy("name", "asc")
    .execute();

  const known = new Set(rows.map(({ name }) => name));
  const missing = PERMISSION_NAMES.filter((name) => !known.has(name));

  if (missing.length > 0) {
    throw new Error(`Permissions missing from the database: ${missing.join(", ")}`);
  }

  return rows;
}

export const permissionsService = {
  get(path: string): string | null {
    return PERMISSION_INDEX.get(path.toUpperCase()) ?? null;
  },
  async init({ retries = 3, delayMs = 500 } = {}) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        await createMissingPermissions();

        const query = await loadPermissions();

        PERMISSION_INDEX = buildPermissionIndex(query)
        PERMISSIONS = freezeTree(buildPermissions(query))

        const stats = analyzePermissions(PERMISSIONS);
        const managed = new Set<string>(PERMISSION_NAMES);
        const unmanaged = query
          .map(({ name }) => name)
          .filter((name) => !managed.has(name));

        appLogger.info(
          `Permissions loaded: total=${stats.total}, managed=${PERMISSION_NAMES.length}, unmanaged=${unmanaged.length}, levels=${JSON.stringify(stats.levels)}`
        )

        if (unmanaged.length > 0) {
          appLogger.debug(`Permissions in the database but not in code: ${unmanaged.join(", ")}`);
        }

        return;
      } catch (e) {
        lastError = e;
        appLogger.warn({
          message: `Permissions load failed (${attempt}/${retries})`,
          error: e,
        })

        if (attempt < retries) await sleep(delayMs * attempt);
      }
    }

    throw lastError;
  },
  getList() {
    return structuredClone(PERMISSIONS)
  },
  isReady() {
    return PERMISSION_INDEX.size > 0;
  }
};
