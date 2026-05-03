import { DATABASES } from "../../constants/dbs";
import { commonPrompts } from "../../lib/cli";
import * as p from "@clack/prompts";
import { InfisicalSDK } from "@infisical/sdk";

const client = new InfisicalSDK({ siteUrl: process.env.INFISICAL_API_URL });

await client.auth().universalAuth.login({
	clientId: process.env.INFISICAL_CLIENT_ID,
	clientSecret: process.env.INFISICAL_CLIENT_SECRET,
});

const { mode, target } = await p.group(commonPrompts({ databases: DATABASES }), {
	onCancel: () => process.exit(0),
});

const { secretValue: dbUrl } = await client.secrets().getSecret({
	environment: mode,
	projectId: process.env.INFISICAL_PROJECT_ID,
	secretName: target.envVar,
	secretPath: "/shared",
});

const s = Bun.spawn({
	cmd: ["bun", "run", "kysely-codegen", `--dialect=${target.dialect}`, `--url=${dbUrl}`, `--out-file=${target.out}`],
	stdout: "inherit",
	stderr: "inherit",
});

await s.exited;
