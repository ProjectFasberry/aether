import { Bot } from "gramio";
import { getEnv } from "../env";
import { invariant } from "@repo/shared/lib/utils";
import { GUARD_COMMANDS } from "./cmds";
import { logger } from "../logger";
import { chats } from "./chats";

let instance: Bot | null = null;

export const bot = {
  logger: logger.child({ name: "bot" }),
  getOptionalInstance(): Bot | null {
    return instance;
  },
	getInstance(): Bot {
		invariant(instance, "Bot is not defined");
		return instance;
	},
	async start(): Promise<void> {
		const token = getEnv().PROD ? getEnv().BOT_GUARD_TOKEN : getEnv().BOT_GUARD_TOKEN_DEV;
		if (!token) throw new Error("BOT_GUARD_TOKEN is not defined");

		const conn = new Bot(token)
			.onStart(async ({ updatesFrom, plugins, info }) => {
				this.logger.debug({ updatesFrom, plugins, info })
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
				const validateChatId = (chatId: string | number) => chats.getData().has(chatId.toString());

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
