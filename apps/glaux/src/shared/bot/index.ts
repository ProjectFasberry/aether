import { Bot } from "gramio";
import { env } from "../env";
import { invariant } from "@repo/shared/lib/utils";
import { GUARD_COMMANDS } from "./cmds";
import { logger } from "../logger";
import { chats } from "./chats";

let instance: Bot | null = null;

export const bot = {
	logger: logger.child("bot"),
	getInstance(): Bot {
		invariant(instance, "Bot is not defined");
		return instance;
	},
	async start(): Promise<void> {
		const token = env.PROD ? env.BOT_GUARD_TOKEN : env.BOT_GUARD_TOKEN_DEV;
		if (!token) throw new Error("BOT_GUARD_TOKEN is not defined");

		const conn = new Bot(token)
			.onStart(async (ctx) => {
				this.logger.info("Started");
				this.logger.info(ctx.updatesFrom, ctx.plugins, ctx.info);
			})
			.onError((ctx) => {
				this.logger.error("Update Error:", ctx.error);
			});

		await conn.start();
		instance = conn;

		await this._init(instance);
	},
	async _init(instance: Bot) {
		try {
			instance.api
				.setMyCommands({
					commands: [{ command: "start", description: "Начать" }],
				})
				.catch((e) => this.logger.error(e));

			const initCommands = () => {
				const validateChatId = (chatId: string | number) => chats.getData().includes(chatId.toString());

				try {
					for (const { name, handlers } of GUARD_COMMANDS) {
						instance.command(name, async (ctx) => {
							const isValid = validateChatId(ctx.chat.id);

							if (!isValid) {
								if (handlers?.public) {
									return handlers.public(ctx);
								}
								return;
							}

							if (handlers?.private) {
								return handlers.private(ctx);
							}
							return;
						});

						this.logger.info(`Command "${name}" inited`);
					}
				} catch (e) {
					this.logger.error(`Init commands error`, e);
				}
			};

			initCommands();
		} catch (e) {
			this.logger.error("Bot initialization failed:", e);
		}
	},
};
