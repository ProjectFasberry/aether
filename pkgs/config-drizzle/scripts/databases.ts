export const DATABASES: Record<string, { urlEnvName: string; dialect: "postgresql" | "mysql" }> = {
	general: { urlEnvName: "GENERAL_POSTGRES_URI", dialect: "postgresql" },
	bisquite: { urlEnvName: "BISQUITE_MYSQL_URI", dialect: "mysql" },
	plan: { urlEnvName: "PLAN_MYSQL_URI", dialect: "mysql" },
	luckperms: { urlEnvName: "LUCKPERMS_POSTGRES_URI", dialect: "postgresql" },
	libertybans: { urlEnvName: "LIBERTYBANS_POSTGRES_URI", dialect: "mysql" },
	playerpoints: { urlEnvName: "PLAYERPOINTS_MYSQL_URI", dialect: "mysql" },
	lobby: { urlEnvName: "LOBBY_MYSQL_URI", dialect: "mysql" },
  skins: { urlEnvName: "SKINS_MYSQL_URI", dialect: "mysql" },
	reputation: { urlEnvName: "REPUTATION_MYSQL_URI", dialect: "mysql" }
};
