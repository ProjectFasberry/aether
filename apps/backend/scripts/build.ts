import fs from "fs"

function getBuildFilesInfo(outputs: Bun.BuildOutput["outputs"]) {
  const files: unknown[] = []

  function processArtifact(artifact: Bun.BuildArtifact) {
    if (!artifact) return;

    let size = 0;

    try {
      const value = fs.statSync(artifact.path).size / (1024 * 1024)
      size = Number(value.toFixed(2));
    } catch { }

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

  for (const output of outputs) {
    processArtifact(output);
  }

  return files;
}

const output = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  minify: true, 
  sourcemap: true,
  target: "bun",
})

console.log(getBuildFilesInfo(output.outputs))