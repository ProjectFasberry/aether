import { appLogger } from "#/shared/constants/logger";
import { general } from "../database/general-db";

let PERMISSIONS: Record<string, any> = {}

export const permissionsService = {
  get(path: string): string | null {
    try {
      const result = path
        .split(".")
        .reduce((acc, part) => acc?.[part.toUpperCase()], PERMISSIONS);

      if (!result || typeof result !== "string") {
        return null;
      }

      return result;
    } catch (e) {
      return null;
    }
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

function buildPermissions(data: { name: string, id: number }[]): Record<string, any> {
  const result: Record<string, any> = {};

  data.forEach(({ name }) => {
    const parts = name.split(".");
    let current = result;

    parts.forEach((part, idx) => {
      const key = part.toUpperCase();

      if (idx === parts.length - 1) {
        current[key] = name;
      } else {
        if (!current[key]) {
          current[key] = {};
        }

        current = current[key];
      }
    });
  });

  return result;
}

type PermissionStats = {
  total: number;
  levels: Record<number, number>;
}

function analyzePermissions(obj: Record<string, any>): PermissionStats {
  const stats: PermissionStats = {
    total: 0, levels: {}
  };

  function recurse(current: Record<string, any>, level: number) {
    stats.levels[level] = (stats.levels[level] || 0) + Object.keys(current).length;

    for (const key in current) {
      if (typeof current[key] === "string") {
        stats.total += 1;
      } else if (typeof current[key] === "object") {
        recurse(current[key], level + 1);
      }
    }
  }

  recurse(obj, 1);

  return stats;
}
