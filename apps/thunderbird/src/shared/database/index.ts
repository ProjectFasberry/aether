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

export const DATABASES_FOR_CHECK: Record<string, DatabaseItem> = {
  bisquite: {
    pool: bisquitePool, dialect: "mariadb",
  },
  lobby: {
    pool: lobbyPool, dialect: "mysql",
  },
  luckperms: {
    pool: luckpermsPool, dialect: "postgres",
  },
  general: {
    pool: generalPool, dialect: "postgres",
  },
  reputation: {
    pool: reputationPool, dialect: "mysql",
  },
  skins: {
    pool: skinsPool, dialect: "mysql",
  },
  playerpoints: {
    pool: playerPointsPool, dialect: "mysql",
  },
  libertybans: {
    pool: libertybansPool, dialect: "postgres",
  },
  plan: {
    pool: planPool, dialect: "mysql",
  },
};
