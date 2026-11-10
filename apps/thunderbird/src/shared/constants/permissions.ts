import { appLogger } from "#/shared/constants/logger";
import { general } from "../database/general-db";
import { sleep } from "@repo/shared/utils";

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

export const permissionsService = {
  get(path: string): string | null {
    return PERMISSION_INDEX.get(path.toUpperCase()) ?? null;
  },
  async init({ retries = 3, delayMs = 500 } = {}) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const query = await general
          .selectFrom("permissions")
          .selectAll()
          .orderBy("name", "asc")
          .execute()

        PERMISSION_INDEX = buildPermissionIndex(query)
        PERMISSIONS = freezeTree(buildPermissions(query))

        const stats = analyzePermissions(PERMISSIONS);

        appLogger.info(
          `Permissions loaded: total=${stats.total}, levels=${JSON.stringify(stats.levels)}`
        )

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
