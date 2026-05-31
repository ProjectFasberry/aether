import * as p from "@clack/prompts";
import { baseOpts, portOpts } from "./index";
import { defineSelectedDatabase } from "./utils";

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
	env: await defineSelectedDatabase(target, mode),
});

await s.exited;
