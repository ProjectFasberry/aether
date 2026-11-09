import { appLogger } from "#/shared/constants/logger";
import { general } from "../database/general-db";

type PermissionTree = { [key: string]: string | PermissionTree };

let PERMISSIONS: PermissionTree = {}

export const permissionsService = {
  get(path: string): string | null {
    const parts = path.split(".").map((part) => part.toUpperCase());

    let node: string | PermissionTree | undefined = PERMISSIONS;

    for (const part of parts) {
      if (!node || typeof node === "string") return null;

      node = node[part];
    }

    return typeof node === "string" ? node : null;
  },
  async init() {
    const query = await general
      .selectFrom("permissions")
      .selectAll()
      .orderBy("name", "asc")
      .execute()

    PERMISSIONS = buildPermissions(query)

    const stats = analyzePermissions(PERMISSIONS);

    appLogger.info(
      `Permissions loaded: total=${stats.total}, levels=${JSON.stringify(stats.levels)}`
    );
  },
  getList() {
    return PERMISSIONS
  }
};

function buildPermissions(data: { name: string, id: number }[]): PermissionTree {
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

function analyzePermissions(obj: PermissionTree): PermissionStats {
  const stats: PermissionStats = {
    total: 0, levels: {}
  };

  function recurse(current: PermissionTree, level: number) {
    stats.levels[level] = (stats.levels[level] || 0) + Object.keys(current).length;

    for (const key in current) {
      const value = current[key];

      if (typeof value === "string") {
        stats.total += 1;
      } else {
        recurse(value, level + 1);
      }
    }
  }

  recurse(obj, 1);

  return stats;
}
