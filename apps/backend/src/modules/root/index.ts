import Elysia from "elysia";
import { initPlayerSkin, updatePlayersSkins } from "../server/skin/skin.model";
import z from "zod";
import bearer from "@elysiajs/bearer";
import { general } from "#/shared/database/general-db";

export const forceSkinInit = new Elysia().get(
	"/skin/:nickname",
	async ({ params: { nickname }, query }) => {
		if (query.type === "single") {
			const ok = await initPlayerSkin(nickname);
			if (!ok) return { data: "error" };
			return { data: "updated" };
		}

		if (query.type === "all") {
			updatePlayersSkins();
		}

		return { data: "started" };
	},
	{
		query: z.object({
			type: z.enum(["single", "all"]).optional().default("single"),
		}),
	},
);

export const force = new Elysia()
	.use(bearer())
	.derive(async ({ bearer, status }) => {
		if (!bearer) {
			throw status(401);
		}

		const isExist = await general
			.selectFrom("api_keys")
			.select("key")
			.where("key", "=", bearer)
			.executeTakeFirst();

		if (!isExist?.key) {
			throw status(401);
		}

		return { bearer: isExist.key };
	})
	.group("/force", (app) => app
		.group("/init", (app) => app
			.use(forceSkinInit)
		)
	);