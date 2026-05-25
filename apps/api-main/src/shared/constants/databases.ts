export const DATABASES: Record<string, { url: string; dialect: "postgresql" | "mysql" }> = {
	general: {
		url: process.env.GENERAL_POSTGRES_URI!, dialect: "postgresql",
	},
	bisquite: {
		url: process.env.BISQUITE_MYSQL_URI!, dialect: "mysql",
	},
	plan: {
		url: process.env.PLAN_MYSQL_URI!, dialect: "mysql",
	},
	luckperms: {
		url: process.env.LUCKPERMS_POSTGRES_URI!, dialect: "postgresql",
	},
	libertybans: {
		url: process.env.LIBERTYBANS_DATABASE_URL!, dialect: "mysql",
	},
	playerpoints: {
		url: process.env.PLAYERPOINTS_MYSQL_URI!, dialect: "mysql",
	},
	lobby: {
		url: process.env.LOBBY_MYSQL_URI!, dialect: "mysql",
	},
	skins: {
		url: process.env.SKINS_DATABASE_URL!, dialect: "mysql",
	}
};