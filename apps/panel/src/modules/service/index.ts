import Elysia, { t } from "elysia";
import { bearer } from "@elysia/bearer";
import { general } from "../../shared/database";
import { bot } from "../../shared/bot";
import { chats } from "../../shared/bot/chats";
import { defineUserRole } from "../../plugins/define";
import { traefik } from "./traefik";

const watchtower = new Elysia().post(
	"/watchtower",
	async ({ body }) => {
		const client = bot.get();
		const list = chats.get();

		const { message, title } = body;

		for (const chat_id of list) {
			await client.api.sendMessage({
				chat_id,
				text: `🛠 *${title}*\n\n\`\`\`\n${message}\n\`\`\``,
				parse_mode: "MarkdownV2",
			});
		}

		return "OK";
	},
	{
		parse: "json",
		body: t.Object({
			message: t.String(),
			title: t.String(),
		}),
	},
);

export const service = new Elysia()
	.use(bearer())
	.use(defineUserRole())
	.derive(async ({ bearer, status, role }) => {
		if (!bearer) {
			if (role.id !== 3) throw status(401);
		} else {
			const isExist = await general.selectFrom("api_keys").select("key").where("key", "=", bearer).executeTakeFirst();

			if (!isExist?.key) throw status(401);

			return { bearer: isExist.key };
		}
	})
	.use(watchtower)
	.use(traefik);
