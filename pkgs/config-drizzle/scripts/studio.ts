import * as p from "@clack/prompts";
import { baseOpts, portOpts } from "./index";
import { defineEnv } from "./utils";

const { mode, target, port } = await p.group(
	{ ...baseOpts, ...portOpts },
	{
		onCancel: () => process.exit(0),
	},
);

const s = Bun.spawn({
	cmd: ["bun", "run", "drizzle-kit", "studio", "--verbose", "--port", `${Number(port)}`],
	stdout: "inherit",
	stderr: "inherit",
	env: await defineEnv(target, mode),
});

await s.exited;
