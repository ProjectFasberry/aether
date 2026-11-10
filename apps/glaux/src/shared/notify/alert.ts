import { bot } from "../bot";
import { chats } from "../bot/chats";
import { appLogger } from "../logger";
import { sendGotify } from "./gotify";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertMessage = {
	from: string;
	message: string;
	title?: string;
	severity?: AlertSeverity;
};

/**
 * Fans one alert out to Gotify and every configured Telegram chat. Gotify does
 * not depend on the bot: a missing instance must not swallow the alert.
 */
export async function sendAlert({ from, message, title, severity }: AlertMessage): Promise<number> {
	const text = severity && severity !== "info" ? `[${severity}] ${message}` : message;

	void sendGotify(title ?? `${from} alert`, text);

	const instance = bot.getOptionalInstance();
	if (!instance) {
		appLogger.warn("alert: bot is not ready, telegram skipped");
		return 0;
	}

	let delivered = 0;

	for (const [chatId] of chats.getData()) {
		try {
			await instance.api.sendMessage({ chat_id: chatId, text });
			delivered += 1;
		} catch (error) {
			appLogger.error(`alert: telegram send failed: ${String(error)}`);
		}
	}

	return delivered;
}
