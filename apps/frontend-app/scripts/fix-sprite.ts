import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

function findFilePath() {
  let currentDir = import.meta.dir;
  const targetRelativePath = "apps/frontend-app/shared/sprite.gen.ts";

  for (let i = 0; i < 5; i++) {
    const fullPath = join(currentDir, targetRelativePath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
    const parentDir = resolve(currentDir, "..");
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  return null;
}

const filePath = findFilePath();

if (!filePath) {
  console.error("❌ Could not find sprite.gen.ts in any parent directories.");
  process.exit(0);
}

try {
  const file = Bun.file(filePath);
  const content = await file.text();

  if (!content.startsWith("// @ts-nocheck")) {
    await Bun.write(filePath, `// @ts-nocheck\n${content}`);
    console.log(`✅ Patched: ${filePath}`);
  } else {
    console.log(`ℹ️ Already patched: ${filePath}`);
  }
} catch (err) {
  console.error("⚠️ Error patching file:", err);
}
