import Elysia from "elysia";
import { getRedis } from "../../shared/redis";
import { flatten, unflatten } from "../../helpers/flat";
import { parse, stringify } from "yaml";
import { wrapError } from "@repo/shared/lib/utils";

const ROOT_KEY = "traefik";

const traefikConfig = new Elysia().get("/", async () => {
	const redis = getRedis();

	const keys = await redis.keys(`${ROOT_KEY}*`);
	if (keys.length === 0) return { data: { yaml: "" } };

	const flatConfig: Record<string, string> = {};

	const pipeline = redis.pipeline();
	keys.forEach((k) => {
		pipeline.get(k);
	});

	const values = await pipeline.exec();

	keys.forEach((key, i) => {
		const val = values?.[i][1] as string;
		flatConfig[key] = val;
	});

	const tree = unflatten(flatConfig, ROOT_KEY);

	const yamlString = stringify(tree, {
		indent: 2,
		aliasDuplicateObjects: false,
	});

	return {
		data: {
			yaml: yamlString,
			rawKeysCount: keys.length,
		},
	};
});

const traefikConfigUpdate = new Elysia().post("/", async ({ body, ...ctx }) => {
	const redis = getRedis();

	try {
		const { yaml } = body as { yaml: string };

		const configObject = parse(yaml);
		if (!configObject || typeof configObject !== "object") {
			throw new Error("Invalid YAML structure");
		}

		const flatConfig = flatten(configObject, ROOT_KEY);
		const pipeline = redis.pipeline();

		const oldKeys = await redis.keys(`${ROOT_KEY}*`);
		if (oldKeys.length > 0) {
			pipeline.del(...oldKeys);
		}

		for (const [key, value] of Object.entries(flatConfig)) {
			pipeline.set(key, value);
		}

		await pipeline.exec();

		return {
			data: {
				message: `Config updated. Keys: ${Object.keys(flatConfig).length}`,
			},
		};
	} catch (e) {
		ctx.status(400);
		return wrapError(e);
	}
});

export const traefik = new Elysia().group("/traefik", (app) => app.use(traefikConfig).use(traefikConfigUpdate));
