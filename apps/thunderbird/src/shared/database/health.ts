import { checkDatabasesHealth, type HealthCheckResult } from "@repo/core/utils/database";
import { logger } from "@repo/shared/utils/logger";
import { DATABASES_FOR_CHECK } from "./index";

export type DatabaseHealth = {
  name: string;
  dialect: "mysql" | "postgres" | "mariadb";
  healthy: boolean;
  checkedAt: Date;
  error?: unknown;
};

const healthLogger = logger.child({ name: "db-health" });
const statuses = new Map<string, DatabaseHealth>();
let ready = false;

export async function refreshDatabaseHealth({
  failOnUnhealthy = false,
  onSuccess,
}: {
  failOnUnhealthy?: boolean;
  onSuccess?: (results: HealthCheckResult[]) => void;
} = {}): Promise<void> {
  let results: HealthCheckResult[] = [];
  let failure: unknown;

  try {
    await checkDatabasesHealth(DATABASES_FOR_CHECK, {
      onSuccess: (value) => {
        results = value;
      },
      onError: (error) => {
        failure = error;
      },
    });
  } catch (error) {
    failure = error;
  }

  const checkedAt = new Date();

  if (failure) {
    for (const [name, item] of Object.entries(DATABASES_FOR_CHECK)) {
      statuses.set(name, {
        name,
        dialect: item.dialect,
        healthy: false,
        checkedAt,
        error: failure,
      });
    }

    ready = true;
    throw failure;
  }

  for (const [name, item] of Object.entries(DATABASES_FOR_CHECK)) {
    const result = results.find((entry) => entry.name === name);

    statuses.set(name, {
      name,
      dialect: item.dialect,
      healthy: result?.healthy ?? false,
      checkedAt,
      error: result?.error,
    });
  }

  ready = true;
  onSuccess?.(results);

  const unhealthy = [...statuses.values()].filter((entry) => !entry.healthy);

  if (unhealthy.length > 0) {
    healthLogger.warn({
      message: "required databases are unavailable",
      databases: unhealthy.map((entry) => entry.name),
    });
  }

  if (failOnUnhealthy && unhealthy.length > 0) {
    throw new Error(`DB_UNAVAILABLE: ${unhealthy.map((entry) => entry.name).join(",")}`);
  }
}

export function areRequiredDatabasesHealthy(): boolean {
  return ready && [...statuses.values()].every((entry) => entry.healthy);
}

export function getDatabaseHealth(): { ready: boolean; databases: DatabaseHealth[] } {
  return {
    ready,
    databases: [...statuses.values()],
  };
}
