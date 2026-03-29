// biome-ignore-all format: 1
// biome-ignore-all lint: 1

import fs from "node:fs";
import { parse } from "yaml";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env.traefik" });

const ROOT_KEY = "traefik:";
const FILE_PATH = "../dynamic.yml";

const redis = new Redis({
	host: process.env.REDIS_HOST,
	port: 6379,
	username: process.env.REDIS_USER,
	password: process.env.REDIS_PASSWORD,
});

const flatten = (obj, path = []) => {
	return Object.entries(obj).reduce((acc, [k, v]) => {
		const newPath = [...path, k];

		if (v && typeof v === "object") {
			Object.assign(acc, flatten(v, newPath));
		} else {
			const finalValue = String(v).replace(/\${(\w+)}/g, (_, v) => process.env[v] || _);

			acc[`${ROOT_KEY}/${newPath.join("/")}`] = finalValue;
		}
	}, {});
};

async function migrate() {
	try {
		const yamlContent = fs.readFileSync(FILE_PATH, "utf8");
		const config = parse(yamlContent);
		const flatConfig = flatten(config);

		const oldKeys = await redis.keys(`${ROOT_KEY}/*`);
		if (oldKeys.length) await redis.del(oldKeys);

		await redis.mset(flatConfig);

		console.log(`Transfer success ${Object.keys(flatConfig).length} keys`);
	} catch (e) {
		console.error("Error", e);
	} finally {
		redis.disconnect();
	}
}

migrate();
