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

const output = await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./dist",
	minify: true,
	sourcemap: true,
	target: "bun",
	// @ts-expect-error
	metafile: true,
});

console.log(await getBuildFilesInfo(output));
