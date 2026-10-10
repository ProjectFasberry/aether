import { Listr } from "listr2";
import fs from "node:fs/promises";
import path from "node:path";
import Cloudflare from 'cloudflare';
import { safeJsonParse } from "@repo/shared/utils"
import { getOrCreateClient } from "@repo/shared/lib/infisical"

const outputDir = path.join(import.meta.dirname, ".tmp");
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
    path.join(import.meta.dirname, "convert-from-openapi.js"), `${openApiDir}/${name}/openapi.yaml`, `${brunoDir}/${name}`,
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

const infisicalClient = await getOrCreateClient();

const { secrets } = await infisicalClient.secrets().listSecrets({
  environment: "prod",
  projectId: process.env.INFISICAL_PROJECT_ID,
  secretPath: "/shared",
});
const targets = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_NAMESPACE_ID", "CLOUDFLARE_API_KEY"] as const;

const requiredSecrets = Object.fromEntries(
  targets.map((target) => {
    const finded = secrets
      .map(d => ({ secretKey: d.secretKey, secretValue: d.secretValue }))
      .find(d => d.secretKey === target);

    if (!finded) throw new Error(`"${target}" is not included in the secrets list`)

    return [target, finded.secretValue]
  })
) as Record<typeof targets[number], string>;

const cloudflareClient = new Cloudflare({
  apiToken: requiredSecrets.CLOUDFLARE_API_KEY
});

const val = await cloudflareClient.kv.namespaces.values.get('services', {
  namespace_id: requiredSecrets.CLOUDFLARE_NAMESPACE_ID,
  account_id: requiredSecrets.CLOUDFLARE_ACCOUNT_ID,
});
const result = await val.text();

const parseRes = safeJsonParse<Record<string, { url: string }>>(result)
if (!parseRes.ok) throw parseRes.error;

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
  Object.entries(parseRes.value).map(([name, service]) => ({
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
