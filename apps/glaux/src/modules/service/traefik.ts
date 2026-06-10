import Elysia, { t } from "elysia";
import { redis } from "../../shared/redis/client";
import { flatten, unflatten } from "../../helpers/flat";
import { parse, stringify } from "yaml";
import { wrapError } from "@repo/shared/lib/utils";

const ROOT_KEY = "traefik";

const traefikConfig = new Elysia().get("/", async () => {
  const redisClient = redis.getInstance();

  const keys = await redisClient.keys(`${ROOT_KEY}*`);
  if (keys.length === 0) return { data: null };

  const flatConfig: Record<string, string> = {};

  const pipeline = redisClient.pipeline();
  keys.forEach((k) => {
    pipeline.get(k);
  });

  const values = await pipeline.exec();

  keys.forEach((key, i) => {
    const val = values?.[i][1] as string;
    flatConfig[key] = val;
  });

  const tree = unflatten(flatConfig, ROOT_KEY);

  const yamlStr = stringify(tree, {
    indent: 2,
    aliasDuplicateObjects: false,
  });

  return {
    data: {
      yaml: yamlStr,
      rawKeysCount: keys.length,
    },
  };
}, {
  response: {
    200: t.Object({
      data: t.Nullable(
        t.Object({
          yaml: t.String({ description: "YAML string representation of the config" }),
          rawKeysCount: t.Number({ description: "Number of raw keys in the config" }),
        }),
      ),
    }),
  },
});

const traefikConfigUpdate = new Elysia().post("/", async ({ body, status }) => {
  const redisClient = redis.getInstance();

  try {
    const { yaml } = body as { yaml: string };

    const configObject = parse(yaml);
    if (!configObject || typeof configObject !== "object") {
      throw new Error("Invalid YAML structure");
    }

    const flatConfig = flatten(configObject, ROOT_KEY);
    const pipeline = redisClient.pipeline();

    const oldKeys = await redisClient.keys(`${ROOT_KEY}*`);
    if (oldKeys.length > 0) {
      pipeline.del(...oldKeys);
    }

    for (const [key, value] of Object.entries(flatConfig)) {
      pipeline.set(key, value);
    }

    await pipeline.exec();

    return {
      data: Object.keys(flatConfig).length,
    };
  } catch (e) {
    return status(400, wrapError(e));
  }
}, {
  response: {
    200: t.Object({
      data: t.Number({ description: "Number of updated keys" }),
    }),
    400: t.Object({
      error: t.String(),
    }),
  },
});

export const traefik = new Elysia()
  .group("/traefik", (app) => app
    .use(traefikConfig)
    .use(traefikConfigUpdate)
  );
