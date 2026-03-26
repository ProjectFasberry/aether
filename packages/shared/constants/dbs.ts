export const dbs: Record<string, { dialect: string; envVar: string; out: string }> = {
  general: { dialect: "postgres", envVar: "GENERAL_POSTGRES_URI", out: "./types/db/auth-database-types.ts" },
  sqlite: { dialect: "sqlite", envVar: "SQLITE_DATABASE_URL", out: "./types/db/sqlite-database-types.ts" },
  payments: { dialect: "postgres", envVar: "PAYMENTS_POSTGRES_URI", out: "./types/db/payments-database-types.ts" },
  skins: { dialect: "mysql", envVar: "SKINS_MYSQL_URI", out: "./types/db/skins-database-types.ts" },
  bisquite: { dialect: "mysql", envVar: "BISQUITE_MYSQL_URI", out: "./types/db/bisquite-database-types.ts" },
  lobby: { dialect: "mysql", envVar: "LOBBY_MYSQL_URI", out: "./types/db/lobby-database-types.ts" },
  luckperms: { dialect: "postgres", envVar: "LUCKPERMS_POSTGRES_URI", out: "./types/db/luckperms-database-types.ts" },
  libertybans: { dialect: "postgres", envVar: "LIBERTYBANS_POSTGRES_URI", out: "./types/db/libertybans-database-types.ts" },
  plan: { dialect: "mysql", envVar: "PLAN_MYSQL_URI", out: "./types/db/plan-database-types.ts" }
} as const;