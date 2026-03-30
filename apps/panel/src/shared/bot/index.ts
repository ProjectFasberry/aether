import { Bot, TelegramError } from "gramio";
import { BOT_GUARD_TOKEN as token } from "../env";
import { logger } from "../logger";
import { invariant } from "@repo/shared/lib/utils";

export const botLogger = logger.withTag("Bot").withTag("Guard");

let guardBot: Bot | null = null;

export function getGuardBot(): Bot {
	invariant(guardBot, "Guard bot is not defined. Call startGuardBot() first.");
	return guardBot;
}

export async function startGuardBot() {
	if (guardBot) {
		botLogger.warn("Guard bot is already initialized");
		return guardBot;
	}

	const bot = new Bot(token)
		.onStart((ctx) => {
			botLogger.success(`Bot @${ctx.info.username} started`);
		})
		.onError((ctx) => {
			botLogger.error("Update Error:", ctx.error);
		});

	try {
		await bot.init();

		guardBot = bot;
		botLogger.info("Guard bot successfully inited");
	} catch (e) {
		if (e instanceof TelegramError) {
			botLogger.error(`Telegram API Error [${e.code}]: ${e.message}`);
		} else {
			botLogger.error("Unknown error during bot init:", e);
		}

		throw e;
	}
}
