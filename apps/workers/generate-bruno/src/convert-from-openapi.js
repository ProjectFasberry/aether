/*
  Converts an OpenAPI specification into a Bruno collection folder.
  Usage: bun run convert.js <openapi.yaml> <output-folder>
*/

import { openApiToBruno } from "@usebruno/converters"
import { stringifyCollection, stringifyFolder, stringifyRequest, stringifyEnvironment } from "@usebruno/filestore";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [inputFile, outputDir] = process.argv.slice(2);
if (!inputFile || !outputDir) {
  console.error('Usage: node convert.js <openapi.yaml> <output-folder>');
  process.exit(1);
}

const format = 'yml';

const safeName = (name) => name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '-');
const write = async (file, content) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
};

async function main() {
  const collection = openApiToBruno(await readFile(inputFile, 'utf8'));

  const brunoConfig = {
    version: collection.version,
    name: collection.name,
    type: 'collection', ignore: ['node_modules', '.git']
  };

  const root = stringifyCollection(collection.root || {}, brunoConfig, { format });
  if (format === 'yml') {
    await write(path.join(outputDir, 'opencollection.yml'), root);
  } else {
    await write(path.join(outputDir, 'bruno.json'), JSON.stringify(brunoConfig, null, 2));
    await write(path.join(outputDir, 'collection.bru'), root);
  }

  for (const env of collection.environments || []) {
    await write(path.join(outputDir, 'environments', `${safeName(env.name)}.${format}`), stringifyEnvironment(env, { format }));
  }

  const stack = collection.items.map((item) => [item, outputDir]);
  while (stack.length) {
    const [item, parent] = stack.pop();
    if (item.type === 'folder') {
      const folderDir = path.join(parent, safeName(item.name));
      await mkdir(folderDir, { recursive: true });

      if (item.root) await write(path.join(folderDir, `folder.${format}`), stringifyFolder(item.root, { format }));
      for (const child of item.items || []) stack.push([child, folderDir]);
    } else {
      await write(path.join(parent, `${safeName(item.name)}.${format}`), stringifyRequest(item, { format }));
    }
  }

  console.log(`Collection written to ${outputDir}`);
}

main();
