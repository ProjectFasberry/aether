import * as p from "@clack/prompts";
import { baseOpts, portOpts, ENV_FILES } from "./index";

const { mode, target, port } = await p.group(
	{ ...baseOpts, ...portOpts },
	{
		onCancel: () => process.exit(0),
	},
);

const cmd = ["bun", "run", ...ENV_FILES[mode], "drizzle-kit", "studio", "--verbose", "--port", `${Number(port)}`];

const s = Bun.spawn({
	cmd,
	stdout: "inherit",
	stderr: "inherit",
	env: { target },
});

await s.exited;
