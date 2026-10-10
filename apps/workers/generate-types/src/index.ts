import { commonPrompts } from "@repo/shared/lib/cli";
import * as p from "@clack/prompts";
import { getOrCreateClient } from "@repo/shared/lib/infisical";
import path from "node:path"

/*
  todo: add the different variants of generating types
  currently, only the "db" option exists
*/
const type = process.argv.find(d => d === "--type") ?? "db";
if (!type) {
  throw new Error(`Option "${type}" is not valid`);
}

// by default is false
const scoped = process.argv.includes("--scoped")

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
  playerpoints: { dialect: "mysql", },
  reputation: { dialect: "mysql" }
} as const;

const outRootDir = path.join(new URL("../../../../pkgs/shared/.out", import.meta.url).pathname, "db");

type Dbs = typeof DECLARED_DATABASES;

const dbs = Object.fromEntries(
  (Object.entries(DECLARED_DATABASES) as Array<[keyof Dbs, Dbs[keyof Dbs]]>).map(
    ([name, config]) => [name, { name, ...config }] as const
  )
) as { [K in keyof Dbs]: Dbs[K] & { name: K } };

const { mode, target } = await p.group(commonPrompts({ scoped, databases: dbs }), {
  onCancel: () => process.exit(0),
});

const client = await getOrCreateClient();

const getDbOut = (name: string) =>
  `${outRootDir}/${name}/index.ts`;

type GenUnit = typeof dbs[keyof typeof dbs] & { dbUrl: string };

async function generate({ dialect, dbUrl, name }: GenUnit) {
  const s = Bun.spawn({
    cmd: [
      "bun", "run",
      "kysely-codegen", `--dialect=${dialect}`, `--url=${dbUrl}`, `--out-file=${getDbOut(name)}`
    ],
    stdout: "inherit", stderr: "inherit",
  });
  await s.exited;
}

const infisicalOptions = {
  environment: mode ?? "development",
  projectId: process.env.INFISICAL_PROJECT_ID,
  secretPath: "/shared",
}

const getEnvVar = (name: string, dialect: string) =>`${name}_${dialect}_URI`.toUpperCase();

if (scoped) {
  const secrets = await client
    .secrets()
    .listSecrets(infisicalOptions)
    .then(({ secrets }) => secrets.map(({ secretKey, secretValue }) => ({ secretKey, secretValue })));

  for (const [name, v] of Object.entries(dbs)) {
    const unit: GenUnit = {
      ...v,
      // @ts-expect-error
      name,
      dbUrl: secrets.find(d => d.secretKey === getEnvVar(name, v.dialect))?.secretValue!
    };

    console.log(`Start generation for "${name}"`)
    await generate(unit);
  }
} else {
  if (!target) throw new Error("target is not defined");

  const { secretValue: dbUrl } = await client.secrets().getSecret({
    ...infisicalOptions,
    secretName: getEnvVar(target.name, target.dialect),
  });

  await generate({ ...target, dbUrl });
}
