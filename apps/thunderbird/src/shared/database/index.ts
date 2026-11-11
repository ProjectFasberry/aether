import type { DatabaseItem } from "@repo/core/utils/database";
import { bisquitePool } from "./bisquite-db";
import { generalPool } from "./general-db";
import { libertybansPool } from "./libertybans-db";
import { lobbyPool } from "./lobby-db";
import { luckpermsPool } from "./luckperms-db";
import { planPool } from "./plan-db";
import { playerPointsPool } from "./playerpoints-db";
import { reputationPool } from "./reputation-db";
import { skinsPool } from "./skins-db";

/**
 * `required` databases gate boot and readiness: without them auth, bans,
 * profiles or balances cannot be served, so failing fast is safer. The rest are
 * game-server or analytics databases; their own routes degrade instead of
 * taking the whole API down.
 */
export type AppDatabaseItem = DatabaseItem & { required: boolean }

export const DATABASES_FOR_CHECK: Record<string, AppDatabaseItem> = {
  bisquite: {
    pool: bisquitePool, dialect: "mariadb", required: false,
  },
  lobby: {
    pool: lobbyPool, dialect: "mysql", required: false,
  },
  luckperms: {
    pool: luckpermsPool, dialect: "postgres", required: true,
  },
  general: {
    pool: generalPool, dialect: "postgres", required: true,
  },
  reputation: {
    pool: reputationPool, dialect: "mysql", required: false,
  },
  skins: {
    pool: skinsPool, dialect: "mysql", required: true,
  },
  playerpoints: {
    pool: playerPointsPool, dialect: "mysql", required: true,
  },
  libertybans: {
    pool: libertybansPool, dialect: "postgres", required: true,
  },
  plan: {
    pool: planPool, dialect: "mysql", required: false,
  },
};
