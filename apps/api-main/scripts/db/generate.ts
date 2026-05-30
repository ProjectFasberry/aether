import { baseOpts } from "./index";
import * as p from "@clack/prompts";
import { defineSelectedDatabase } from "./utils";

const { mode, target } = await p.group(baseOpts, {
	onCancel: () => process.exit(0),
});

const s = Bun.spawn({
  cmd: [
    "bun", "run",
    "drizzle-kit", "generate"
  ],
	stdout: "inherit",
	stderr: "inherit",
	env: await defineSelectedDatabase(target, mode)
});

await s.exited;
