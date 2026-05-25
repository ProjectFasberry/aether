import fs from "node:fs";

async function getBuildFilesInfo(output: Bun.BuildOutput) {
	const files: unknown[] = [];

	function processArtifact(artifact: Bun.BuildArtifact) {
		if (!artifact) return;

		let size = 0;

		try {
			const value = fs.statSync(artifact.path).size / (1024 * 1024);
			size = Number(value.toFixed(2));
		} catch {}

		files.push({
			path: artifact.path,
			loader: artifact.loader,
			kind: artifact.kind,
			size,
			hash: artifact.hash,
		});

		if (artifact.sourcemap) {
			processArtifact(artifact.sourcemap);
		}
	}

	for (const target of output.outputs) {
		processArtifact(target);
	}

	// @ts-expect-error
	if (output.metafile) {
		// @ts-expect-error
		await Bun.write("./dist/meta.json", JSON.stringify(output.metafile));
	}

	return files;
}

type Stage = "staging" | "prod";
const STAGE = Bun.env["STAGE"] as Stage | undefined;

const opts: Partial<Record<Stage, Partial<Bun.BuildConfig>>> = {
	staging: {
		minify: false,
		sourcemap: true,
		// @ts-expect-error
		metafile: true,
	},
	prod: {
		minify: true,
		sourcemap: false,
		// @ts-expect-error
		metafile: false,
	},
};

const buildOpts = opts[STAGE ?? "staging"];

const fullOpts: Bun.BuildConfig = {
	entrypoints: ["./src/index.ts"],
	outdir: "./dist",
	target: "bun",
	external: [
		// https://github.com/elysiajs/elysia-bearer/issues/25
		"@elysia/bearer",
	],
	...buildOpts,
};

const output = await Bun.build(fullOpts);

console.log(
	`\nBuild successful.`,
	`\nStage: ${STAGE}`,
	`\nOpts:`,
	buildOpts,
	`\nResult:`,
	await getBuildFilesInfo(output),
	`\n`,
);
