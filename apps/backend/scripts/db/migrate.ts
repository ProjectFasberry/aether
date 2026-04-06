import { baseOpts, ENV_FILES } from "./index";
import * as p from "@clack/prompts";

const { mode, target } = await p.group(baseOpts, {
	onCancel: () => process.exit(0),
});

const cmd = ["bun", "run", ...ENV_FILES[mode], "drizzle-kit", "migrate"];

const s = Bun.spawn({
	cmd,
	stdout: "inherit",
	stderr: "inherit",
	env: { target },
});

await s.exited;
