export type Databases = Record<string, { dialect: string; envVar: string; out: string }>;

export const DATABASES: Databases = {
  general: { dialect: "postgres", envVar: "GENERAL_POSTGRES_URI", out: "./types/db/general/index.ts" },
  payments: { dialect: "postgres", envVar: "PAYMENTS_POSTGRES_URI", out: "./types/db/payments/index.ts" },
  skins: { dialect: "mysql", envVar: "SKINS_MYSQL_URI", out: "./types/db/skins/index.ts" },
  bisquite: { dialect: "mysql", envVar: "BISQUITE_MYSQL_URI", out: `./types/db/bisquite/index.ts` },
  lobby: { dialect: "mysql", envVar: "LOBBY_MYSQL_URI", out: "./types/db/lobby/index.ts" },
  luckperms: { dialect: "postgres", envVar: "LUCKPERMS_POSTGRES_URI", out: "./types/db/luckperms/index.ts" },
  libertybans: { dialect: "postgres", envVar: "LIBERTYBANS_POSTGRES_URI", out: "./types/db/libertybans/index.ts" },
  plan: { dialect: "mysql", envVar: "PLAN_MYSQL_URI", out: "./types/db/plan/index.ts" },
  playerpoints: { dialect: "mysql", envVar: "PLAYERPOINTS_MYSQL_URI", out: "./types/db/playerpoints/index.ts" },
} as const;
