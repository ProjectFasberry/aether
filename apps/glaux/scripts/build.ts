import { convertChunksResult, getBuildFilesInfo } from "@repo/shared/utils/build";
import { SERVICE_NAME } from "../src/shared/const/internal";
import { logger } from "../src/shared/logger";

type Stage = "staging" | "prod";
const STAGE = Bun.env["STAGE"] as Stage | undefined;

const opts: Record<Stage, Partial<Bun.BuildConfig> & { metafile: boolean }> = {
	staging: {
		minify: false,
		sourcemap: true,
		metafile: true,
	},
	prod: {
		minify: true,
		sourcemap: true,
		metafile: false,
	},
};

const buildOpts: Bun.BuildConfig = {
	entrypoints: ["./src/index.ts"],
	outdir: "./dist",
	target: "bun",
	external: [
		// https://github.com/elysiajs/elysia-bearer/issues/25
		"@elysia/bearer",
	],
	...opts[STAGE ?? "staging"],
};

const output = await Bun.build(buildOpts);
const outputChunks = await getBuildFilesInfo(output);

const msg = {
	name: SERVICE_NAME,
	stage: STAGE,
	opts: buildOpts,
	result: convertChunksResult(outputChunks),
};

logger.info(JSON.stringify(msg, null, 2).slice(1, -1), {
	title: "Build",
	style: { borderColor: "green" },
	asBox: true
});
