import Elysia from "elysia";
import { bearer } from "@elysiajs/bearer";
import { general } from "../../shared/database";
import { getGuardBot } from "../../shared/bot";
import { getChats } from "../../shared/bot/chats";
import { defineUserRole } from "../../plugins/define";
import { traefik } from "./traefik";
const watchtower = new Elysia().post(
	"/watchtower",
	async ({ body }) => {
		const bot = getGuardBot();
		const chats = getChats();
		const { message, title } = body;
		for (const chat_id of chats) {
			await bot.api.sendMessage({
				chat_id,
				text: `🛠 *${title}*\n\n\`\`\`\n${message}\n\`\`\``,
				parse_mode: "MarkdownV2",
			});
		}
		return "ok";
	},
	{ parse: "json" },
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
