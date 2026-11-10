import { commonPrompts } from "@repo/shared/lib/cli";
import * as p from "@clack/prompts";
import { getOrCreateClient } from "@repo/shared/lib/infisical";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

/*
  Generates DB types into pkgs/shared/.out/db/<name>/index.ts.

  Interactive:
    bun run db

  Non-interactive (secrets come from process.env, no Infisical SDK calls):
    infisical run --env=prod --path=/shared -- bun run ./src/index.ts \
      --type=db --no-interactive --env=prod --scoped

  Flags:
    --type=db          only "db" is supported today
    --scoped           every declared database
    --no-interactive   no prompts, read <NAME>_<DIALECT>_URI from env
    --env=dev|prod     required with --no-interactive
    --target=<name>    one database instead of --scoped
    --host=<host>      rewrite URL host, e.g. prod secrets point at 127.0.0.1
*/

const { values: flags } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    type: { type: "string", default: "db" },
    scoped: { type: "boolean", default: false },
    "no-interactive": { type: "boolean", default: false },
    env: { type: "string" },
    target: { type: "string" },
    host: { type: "string" },
  },
  strict: true,
  allowPositionals: false,
});

if (flags.type !== "db") {
  throw new Error(`Option "--type=${flags.type}" is not valid`);
}

if (flags.scoped && flags.target) {
  throw new Error('Use either "--scoped" or "--target=<name>", not both');
}

const scoped = flags.scoped;

// naming for databases:
// [NAME]_[DIALECT]_URI
// where all variable with uppercase
const DECLARED_DATABASES = {
  general: { dialect: "postgres" },
  payments: { dialect: "postgres" },
  skins: { dialect: "mysql" },
  bisquite: { dialect: "mysql" },
  lobby: { dialect: "mysql" },
  luckperms: { dialect: "postgres" },
  libertybans: { dialect: "postgres" },
  plan: { dialect: "mysql" },
  playerpoints: { dialect: "mysql" },
  reputation: { dialect: "mysql" },
} as const;

const outRootDir = path.join(new URL("../../../../pkgs/shared/.out", import.meta.url).pathname, "db");

type Dbs = typeof DECLARED_DATABASES;
type DbName = keyof Dbs;

const dbs = Object.fromEntries(
  (Object.entries(DECLARED_DATABASES) as Array<[DbName, Dbs[DbName]]>).map(
    ([name, config]) => [name, { name, ...config }] as const
  )
) as { [K in DbName]: Dbs[K] & { name: K } };

type GenUnit = Dbs[DbName] & { name: DbName; dbUrl: string };

const GENERATION_TIMEOUT_MS = 120_000;

const getEnvVar = (name: string, dialect: string) => `${name}_${dialect}_URI`.toUpperCase();
const getDbOut = (name: string) => `${outRootDir}/${name}/index.ts`;
const isDbName = (name: string): name is DbName => Object.hasOwn(dbs, name);

/** Prod secrets live on the deploy host loopback; `--host` rebinds them. */
const withHost = (dbUrl: string): string => {
  if (!flags.host) return dbUrl;

  const url = new URL(dbUrl);
  url.hostname = flags.host;

  return url.toString();
};

async function generate({ dialect, dbUrl, name }: GenUnit): Promise<boolean> {
  console.log(`Start generation for "${name}"`);

  mkdirSync(path.dirname(getDbOut(name)), { recursive: true });

  const s = Bun.spawn({
    cmd: [
      "bun", "run",
      "kysely-codegen", `--dialect=${dialect}`, `--url=${dbUrl}`, `--out-file=${getDbOut(name)}`
    ],
    // The CLI lives in this workspace, so the caller's cwd must not matter.
    cwd: import.meta.dir,
    stdout: "inherit", stderr: "inherit",
  });

  const timer = setTimeout(() => s.kill(), GENERATION_TIMEOUT_MS);
  const code = await s.exited;
  clearTimeout(timer);

  if (code !== 0) {
    console.error(`kysely-codegen for "${name}" exited with code ${code}`);
  }

  return code === 0;
}

function finish(mode: string, failures: string[], generated: number): void {
  if (failures.length > 0) {
    process.exitCode = 1;
    console.error(`Failed (${mode}): ${failures.join("; ")}`);
    return;
  }

  if (generated === 0) {
    process.exitCode = 1;
    console.error(`Nothing generated (${mode}): no database secrets matched`);
    return;
  }

  console.log(`Generated ${generated} database(s) for "${mode}"`);
}

/** Non-interactive: URLs are already in the environment injected by `infisical run`. */
async function runFromEnv(mode: "dev" | "prod"): Promise<void> {
  const requested = flags.target ? [flags.target] : scoped ? Object.keys(dbs) : [];

  if (requested.length === 0) {
    throw new Error('Pass "--target=<name>" or "--scoped" with "--no-interactive"');
  }

  const names = requested.map((name) => {
    if (isDbName(name)) return name;

    throw new Error(`Unknown database "${name}". Available: ${Object.keys(dbs).join(", ")}`);
  });

  const failures: string[] = [];
  const explicitTarget = Boolean(flags.target);
  let generated = 0;

  for (const name of names) {
    const unit = dbs[name];
    const envVar = getEnvVar(unit.name, unit.dialect);
    const raw = process.env[envVar];

    if (!raw) {
      if (explicitTarget) failures.push(`${name}: ${envVar} is not set`);
      else console.warn(`Skip "${name}": ${envVar} is not set`);
      continue;
    }

    if (await generate({ ...unit, dbUrl: withHost(raw) })) generated += 1;
    else failures.push(`${name}: generation failed`);
  }

  finish(mode, failures, generated);
}

async function runInteractive(): Promise<void> {
  const answers = await p.group(commonPrompts({ scoped, databases: dbs }), {
    onCancel: () => process.exit(0),
  });

  const mode = answers.mode as "dev" | "prod";
  const selected: Array<Dbs[DbName] & { name: DbName }> = scoped
    ? Object.values(dbs)
    : [answers.target as Dbs[DbName] & { name: DbName }];

  const client = await getOrCreateClient();
  const infisicalOptions = {
    environment: mode,
    projectId: process.env.INFISICAL_PROJECT_ID,
    secretPath: "/shared",
  };

  const failures: string[] = [];
  let generated = 0;

  for (const unit of selected) {
    const envVar = getEnvVar(unit.name, unit.dialect);
    let dbUrl: string | undefined;

    try {
      const { secretValue } = await client.secrets().getSecret({
        ...infisicalOptions,
        secretName: envVar,
      });

      dbUrl = secretValue;
    } catch (error) {
      failures.push(`${unit.name}: ${envVar} is not available (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }

    if (await generate({ ...unit, dbUrl: withHost(dbUrl) })) generated += 1;
    else failures.push(`${unit.name}: generation failed`);
  }

  finish(mode, failures, generated);
}

if (flags["no-interactive"]) {
  if (flags.env !== "dev" && flags.env !== "prod") {
    throw new Error('"--env=dev|prod" is required with "--no-interactive"');
  }

  await runFromEnv(flags.env);
} else {
  await runInteractive();
}
