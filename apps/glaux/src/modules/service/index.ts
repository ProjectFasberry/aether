import Elysia, { t } from "elysia";
import { bot } from "../../shared/bot";
import { chats } from "../../shared/bot/chats";
import { traefik } from "./traefik";
import { defineBearer } from "../../lib/define";

const watchtower = new Elysia().post(
	"/watchtower",
	async ({ body }) => {
		const { message, title } = body;

		for (const chat_id of chats.getData()) {
			await bot.getInstance().api.sendMessage({
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

export const service = new Elysia().use(defineBearer()).use(watchtower).use(traefik);
