import { DATABASES } from "./databases";

export async function getDatabaseUrl(databaseName: string, _mode: "dev" | "prod") {
	const secretName = getDatabase(databaseName).urlEnvName;
	const value = process.env[secretName];

	if (!value) throw new Error(`${secretName} is not set in the environment`);
	return value;
}

export function getDatabase(name: keyof typeof DATABASES) {
	const target = DATABASES[name];
	if (!target) throw new Error(`Database "${name}" not found`);
	return target;
}

export const getDatabasesList = () => Object.keys(DATABASES)

async function defineSelectedDatabase(databaseName: string, mode: "dev" | "prod") {
	const url = await getDatabaseUrl(databaseName, mode);
	const dialect = getDatabase(databaseName).dialect;

	return {
		SELECTED_URL: url,
		SELECTED_DATABASE: databaseName,
		SELECTED_DIALECT: dialect,
	};
}

export async function defineEnv(databaseName: string, mode: "dev" | "prod") {
  return {
    ...process.env,
    ...await defineSelectedDatabase(databaseName, mode)
  }
};
