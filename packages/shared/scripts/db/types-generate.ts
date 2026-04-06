import { DATABASES } from "../../constants/dbs";
import { commonPrompts, loadEnv } from "../../lib/cli";
import * as p from "@clack/prompts";

const { mode, target } = await p.group(commonPrompts({ databases: DATABASES }), {
	onCancel: () => process.exit(0),
});

loadEnv(mode === "prod" ? ".env.production" : ".env.development");

const dbUrl = process.env[target.envVar];
if (!dbUrl) throw new Error(`URL for ${target.envVar} not found in ${mode} env`);

const s = Bun.spawn({
	cmd: ["bun", "run", "kysely-codegen", `--dialect=${target.dialect}`, `--url=${dbUrl}`, `--out-file=${target.out}`],
	stdout: "inherit",
	stderr: "inherit",
});

await s.exited;
