import Elysia, { t } from "elysia";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import { wrapError } from "@repo/shared/lib/helpers";
import { getEnv } from "../../shared/env";
import { validateSessionPermission } from "../../lib/define";

const PERMISSION = "config.panel.read";
const DEFAULT_PATH = "/etc/traefik/config/dynamic.yml";

/**
 * Traefik reads its dynamic config from a watched file (`providers.file` in
 * `traefik.yml`), not from Redis. The panel therefore edits that file
 * atomically: a temp file in the same directory, ownership copied from the
 * current file (the host user also rewrites it from ddns.py), then rename.
 * Traefik's file watcher reloads on the rename.
 */
const dynamicPath = () => getEnv().TRAEFIK_DYNAMIC_PATH ?? DEFAULT_PATH;

async function readConfig(): Promise<{ yaml: string; rawKeysCount: number } | null> {
  const content = await fs.readFile(dynamicPath(), "utf8").catch(() => null);
  if (content === null) return null;

  let parsed: unknown;

  try {
    parsed = parse(content);
  } catch {
    // Still return the raw text: a broken file must be editable from the panel.
    return { yaml: content, rawKeysCount: 0 };
  }

  const rawKeysCount =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.keys(parsed as Record<string, unknown>).length
      : 0;

  return { yaml: content, rawKeysCount };
}

async function writeConfig(content: string): Promise<number> {
  const parsed = parse(content);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid YAML structure");
  }

  const target = dynamicPath();
  const stat = await fs.stat(target).catch(() => null);
  const temp = join(dirname(target), `.dynamic.${process.pid}.${Date.now()}.tmp`);

  await fs.writeFile(temp, content, { mode: stat?.mode ?? 0o644 });

  if (stat) {
    // Keep the host user as the owner: ddns.py and the ops scripts rewrite the
    // same file and must keep writing it without sudo.
    await fs.chown(temp, stat.uid, stat.gid).catch(() => undefined);
  }

  await fs.rename(temp, target);

  return Object.keys(parsed as Record<string, unknown>).length;
}

const traefikConfig = new Elysia()
  .get("/", async () => {
    return { data: await readConfig() };
  }, {
    response: {
      200: t.Object({
        data: t.Nullable(
          t.Object({
            yaml: t.String({ description: "YAML string of the dynamic config" }),
            rawKeysCount: t.Number({ description: "Number of top-level keys" }),
          }),
        ),
      }),
    },
    detail: {
      summary: "Get Traefik dynamic configuration"
    }
  });

const traefikConfigUpdate = new Elysia()
  .post("/", async ({ body, status }) => {
    try {
      const { yaml } = body as { yaml: string };
      const count = await writeConfig(yaml);

      return { data: count };
    } catch (e) {
      return status(400, wrapError(e));
    }
  }, {
    body: t.Object({
      yaml: t.String({ minLength: 1, maxLength: 1024 * 1024 }),
    }),
    response: {
      200: t.Object({
        data: t.Number({ description: "Number of top-level keys written" }),
      }),
      400: t.Object({
        error: t.String(),
      }),
    },
    detail: {
      summary: "Update Traefik dynamic configuration"
    }
  });

export const traefik = new Elysia()
  .group("/traefik", (app) => app
    .use(validateSessionPermission(PERMISSION))
    .use(traefikConfig)
    .use(traefikConfigUpdate)
  );
