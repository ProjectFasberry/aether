import Elysia from "elysia";
import { general } from "#/shared/database/general-db";
import type { JsonValue } from "@repo/shared/types/db/general-database-types";
import { defineUser } from "#/lib/middlewares/define";
import * as z from "zod/v4";
import { getRedis } from "#/shared/redis/init";
import { getRedisKey } from "#/helpers/redis";
import { nanoid } from "nanoid";

type PlayerSocialsValuePayload = {
	id: string | number;
	username: string;
};

export type PlayerSocialsPayload = {
	type: "telegram" | "discord";
	value: PlayerSocialsValuePayload;
};

type Initial = {
	id: number;
	created_at: Date;
	social: "telegram" | "discord";
	value: JsonValue;
};

const playerSocialsAvailable = new Elysia()
	.use(defineUser())
	.get("/available", async ({ nickname }) => {
		const query = await general
			.selectFrom("players_socials")
			.select(["social"])
			.where("nickname", "=", nickname)
			.execute();

		const all = [
			{ title: "Telegram", social: "telegram" },
			{ title: "Discord", social: "discord" },
		];

		if (!query.length) {
			return { data: all }
		}

		const data = query
			.map((i) =>
				all
					.map((t) => t.social).includes(i.social) &&
				all
					.find((t) => t.social !== i.social)
			)
			.filter(Boolean);

		console.log(data);

		return { data };
	});

const playerSocialsAddEvents = new Elysia().get("/add/events", async (ctx) => {
	// const existsRequest = safeJsonParse<unknown>(existsRequestStr)
});

const getSocialsAddCacheKey = (nickname: string, social: string) =>
	getRedisKey("internal", `socials:${nickname}:${social}:connect`);

const playerSocialsAddList = new Elysia()
	.use(defineUser())
	.get("/add/list", async ({ nickname }) => {
		const redis = getRedis();

		const data: { social: string; code: string }[] = [];

		return { data };
	});

const playerSocialsAdd = new Elysia()
	.use(defineUser())
	.post("/add", async ({ status, nickname, body: { social } }) => {
		const socialIsExist = await general
			.selectFrom("players_socials_available")
			.select("value")
			.where("value", "=", social)
			.executeTakeFirst();

		if (!socialIsExist || !socialIsExist.value) {
			throw status(400, "not-exist-social");
		}

		const query = await general
			.selectFrom("players_socials")
			.select("social")
			.where("social", "=", social)
			.where("nickname", "=", nickname)
			.executeTakeFirst();

		if (query && query.social) {
			throw status(400, "exist-target-social");
		}

		const redis = getRedis();
		const socialRedisKey = getSocialsAddCacheKey(nickname, social);

		const existsRequestStr = await redis.get(socialRedisKey);

		if (existsRequestStr) {
			throw status(400, "exist-request");
		}

		const code = nanoid(4);

		const reqPayload = {
			created_at: new Date().toISOString(),
			code,
		};

		await redis.set(socialRedisKey, JSON.stringify(reqPayload), "EX", 5 * 60);

		const data = {
			code,
			target: social,
		};

		return { data };
	}, {
		body: z.object({
			social: z.string().min(2),
		}),
	});

const playerSocialsDelete = new Elysia()
	.use(defineUser())
	.delete("/:social", async ({ status, nickname, params: { social } }) => {
		const query = await general
			.deleteFrom("players_socials")
			.where("social", "=", social)
			.where("nickname", "=", nickname)
			.executeTakeFirstOrThrow();

		if (!query.numDeletedRows) throw status(500)

		return { data: { social } };
	}, {
		params: z.object({
			social: z.string().min(2),
		}),
	});

const playerSocialsList = new Elysia()
	.get("/list/:nickname", async ({ params: { nickname } }) => {
		const query = await general
			.selectFrom("players_socials")
			.select(["id", "created_at", "social", "value"])
			.where("nickname", "=", nickname.toLowerCase())
			.$castTo<Initial>()
			.execute();

		const payload = query.map((item) => {
			if (!item.value) throw new Error("No value in player socials");

			const result = item.value as PlayerSocialsValuePayload;

			return {
				type: item.social,
				value: result,
			};
		});

		const data: PlayerSocialsPayload[] = payload;

		return { data };
	});

export const playerSocials = new Elysia()
	.group("/socials", (app) => app
		.use(playerSocialsAdd)
		.use(playerSocialsAddList)
		.use(playerSocialsAddEvents)
		.use(playerSocialsDelete)
		.use(playerSocialsAvailable)
		.use(playerSocialsList)
	);