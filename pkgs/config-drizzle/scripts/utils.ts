import { DATABASES } from "./databases";
import { InfisicalSDK } from "@infisical/sdk";
import * as z from "zod";

const infisicalSchema = z.object({
	INFISICAL_CLIENT_ID: z.string(),
	INFISICAL_CLIENT_SECRET: z.string(),
  INFISICAL_PROJECT_ID: z.string(),
	INFISICAL_API_URL: z.string()
});

const infisicalEnv = infisicalSchema.parse(process.env);

export async function getDatabaseUrl(databaseName: string, mode: "dev" | "prod") {
	const { INFISICAL_CLIENT_ID, INFISICAL_API_URL, INFISICAL_CLIENT_SECRET, INFISICAL_PROJECT_ID } = infisicalEnv;

	const client = new InfisicalSDK({
		siteUrl: INFISICAL_API_URL
	});

	await client.auth().universalAuth.login({
		clientId: INFISICAL_CLIENT_ID,
		clientSecret: INFISICAL_CLIENT_SECRET,
	});

	const secretName = getDatabase(databaseName).urlEnvName;

	try {
		const singleSecret = await client.secrets().getSecret({
			environment: mode,
			projectId: INFISICAL_PROJECT_ID,
			secretName,
			expandSecretReferences: true,
			viewSecretValue: true,
			includeImports: true,
			secretPath: "/thunderbird",
		});

		return singleSecret.secretValue;
	} catch (e) {
		if (e instanceof Error) {
			if (e.message.includes("StatusCode=404")) {
				throw new Error(`Secret "${secretName}" not found in environment "${mode}"`);
			}
		}

		throw e;
	}
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
