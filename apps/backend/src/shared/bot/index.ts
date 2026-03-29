import { Bot, TelegramError } from "gramio";
import { BOT_GUARD_TOKEN as token } from "../env";
import { logger } from "#/utils/config/logger";
import { GUARD_COMMANDS } from "./cmds";
import { getChats } from "../constants/chats";
import { invariant } from "#/helpers/invariant";

function validateChatId(chatId: string | number) {
	const chats = getChats();
	return chats.includes(chatId.toString());
}

export const botLogger = logger.withTag("Bot").withTag("Guard");

let guardBot: Bot | null = null;

export function getGuardBot(): Bot {
	invariant(guardBot, "Guard bot is not defined");
	return guardBot;
}

export function initCommands(bot: Bot) {
	try {
		for (const { name, publicHandler, handler } of GUARD_COMMANDS) {
			bot.command(name, async (ctx) => {
				const isValid = validateChatId(ctx.chat.id);
				if (!isValid) {
					if (publicHandler) {
						return publicHandler(ctx);
					}
					return;
				}

				return handler(ctx);
			});
			botLogger.success(`Command "${name}" inited`);
		}
	} catch (e) {
		botLogger.error(`Init commands error`, e);
	}
}

export async function startGuardBot() {
	guardBot = new Bot(token)
		.onStart(async (ctx) => {
			botLogger.success("Started");
			botLogger.log(ctx.updatesFrom, ctx.plugins, ctx.info);

			const bot = guardBot!;

			bot.api
				.setMyCommands({
					commands: [{ command: "start", description: "Начать" }],
				})
				.catch((e) => botLogger.error(e));

			initCommands(bot);
		})
		.onError((ctx) => {
			const error = ctx.error;
			botLogger.error(error);
		});

	try {
		await guardBot.start();
	} catch (e) {
		if (e instanceof TelegramError) {
			botLogger.warn("Guard bot is not started by conflict instances. But instance inited");
			await guardBot.init();
		}

		botLogger.error(e);
	}
}
