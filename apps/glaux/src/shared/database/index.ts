import { type DatabaseItem } from "@repo/core/utils/database";
import { skinsPool } from "./skins-db";
import { generalPool } from "./general-db";

export const DATABASES_FOR_CHECK: Record<string, DatabaseItem> = {
	general: { pool: generalPool, dialect: "postgres" },
	skins: { pool: skinsPool, dialect: "mysql" },
};
