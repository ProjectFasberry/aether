import { commonPrompts } from "@repo/shared/lib/cli";
import * as p from "@clack/prompts";
import { getOrCreateClient } from "@repo/shared/lib/infisical";
import path from "node:path"

// by default is false
const scoped = process.argv.includes("--scoped")

const DECLARED_DATABASES = {
  general: { dialect: "postgres", envVariable: "GENERAL_POSTGRES_URI" },
  payments: { dialect: "postgres", envVariable: "PAYMENTS_POSTGRES_URI" },
  skins: { dialect: "mysql", envVariable: "SKINS_MYSQL_URI" },
  bisquite: { dialect: "mysql", envVariable: "BISQUITE_MYSQL_URI" },
  lobby: { dialect: "mysql", envVariable: "LOBBY_MYSQL_URI" },
  luckperms: { dialect: "postgres", envVariable: "LUCKPERMS_POSTGRES_URI" },
  libertybans: { dialect: "postgres", envVariable: "LIBERTYBANS_POSTGRES_URI" },
  plan: { dialect: "mysql", envVariable: "PLAN_MYSQL_URI" },
  playerpoints: { dialect: "mysql", envVariable: "PLAYERPOINTS_MYSQL_URI" },
} as const;

const outRootDir = path.join(import.meta.dirname, ".out");

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
      dbUrl: secrets.find(d => d.secretKey === v.envVariable)?.secretValue!
    };

    console.log(`Start generation for "${name}"`)
    await generate(unit);
  }
} else {
  if (!target) throw new Error("target is not defined");

  const { secretValue: dbUrl } = await client.secrets().getSecret({
    ...infisicalOptions,
    secretName: target.envVariable,
  });

  await generate({ ...target, dbUrl });
}
