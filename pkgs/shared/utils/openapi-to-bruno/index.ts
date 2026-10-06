import { Listr } from "listr2";
import fs from "node:fs/promises";
import path from "node:path";

const outputDir = path.join(__dirname, ".tmp");
const openApiDir = `${outputDir}/openapi`;
const brunoDir = `${outputDir}/bruno`;

//#region
/*
 Start bruno pipe
 includes generations collections from openapi spec
*/
export async function generateBrunoPipe({
  name, verbose
}: {
  name: string, verbose?: boolean
}) {
  await fs.mkdir(brunoDir, { recursive: true })

  const proc = Bun.spawn([
    "bun", "run",
    path.join(__dirname, "convert-from-openapi.js"), `${openApiDir}/${name}/openapi.yaml`, `${brunoDir}/${name}`,
  ], {
    stderr: "pipe", stdout: "pipe"
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (verbose) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }

  if (exitCode !== 0) throw new Error(stderr);
}
//#endregion

//#region
/*
 Get openapi spec from url and save it to disk
 Transform openapi json to yaml
*/
export async function generateOpenApiOut({
  name, openApiUrl, verbose
}: {
  name: string, openApiUrl: string, verbose?: boolean
}) {
  const res = await fetch(openApiUrl)
  if (!res.ok) throw new Error(`openapi req failed: ${res.status}`)
  const data = await res.json()

  const openapiDir = `${openApiDir}/${name}`;

  await fs.mkdir(openapiDir, { recursive: true })
  await fs.writeFile(
    `${openapiDir}/openapi.json`,
    JSON.stringify(data, null, 2),
  )

  const proc = Bun.spawn([
    'bun', 'run',
    'openapi-format', `${openapiDir}/openapi.json`, '-o', `${openapiDir}/openapi.yaml`,
  ], {
    stderr: "pipe", stdout: "pipe"
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (verbose) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }

  if (exitCode !== 0) throw new Error(stderr)
}
//#endregion

//#region
/*
 Generate bruno collections for the services
 @param --verbose -> verbosing stdout/stderr, default: false
*/
const verbose = process.argv.includes("--verbose");

const services = {
  glaux: {
    url: "http://127.0.0.1:5105/openapi/json"
  },
  thunderbird: {
    url: "http://127.0.0.1:5104/openapi/json",
  }
}

const categories = ["format-openapi", "gen-collection"] as const;

type Category = typeof categories[number];
type ResultBase = { category: Category }
type Result =
  | (ResultBase & { isOk: true, err?: never })
  | (ResultBase & { isOk: false, err: Error | null })

let results: Map<string, Result[]> = new Map()

const getErr = (err: unknown): Error | null =>
  verbose ? err instanceof Error ? err : new Error(String(err)) : null

const assign = (name: string, category: Result["category"], res?: Omit<Result, "category">): void => {
  const part = (res ? { category, ...res } : { category, isOk: true }) as Result;
  results.set(name, [...(results.get(name) ?? []), part])
}

const tasks = new Listr(
  Object.entries(services).map(([name, service]) => ({
    title: name,
    task: async (_, task) => {
      task.output = "format-openapi";

      try {
        await generateOpenApiOut({ openApiUrl: service.url, name, verbose });
        assign(name, "format-openapi");
      } catch (e) {
        assign(name, "format-openapi", { isOk: false, err: getErr(e) });
        throw e;
      }

      task.output = "gen-collection";

      try {
        await generateBrunoPipe({ name, verbose });
        assign(name, "gen-collection");
      } catch (e) {
        assign(name, "gen-collection", { isOk: false, err: getErr(e) });
        throw e;
      }
    },
  })),
  {
    concurrent: 4,
    exitOnError: false,
  },
);

await tasks.run();
//#endregion
