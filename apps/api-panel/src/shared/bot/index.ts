import { Bot } from "gramio";
import { env } from "../env";
import { invariant } from "@repo/shared/lib/utils";
import { initCommands } from "./cmds";
import { botLogger } from "../logger";

let instance: Bot | null = null;

export const bot = {
	get(): Bot {
		invariant(instance, "Guard bot is not defined. Call startGuardBot() first.");
		return instance;
	},
	async start(): Promise<void> {
		const conn = new Bot(env.BOT_GUARD_TOKEN)
			.onStart(async (ctx) => {
				botLogger.success("Started");
				botLogger.log(ctx.updatesFrom, ctx.plugins, ctx.info);
			})
			.onError((ctx) => {
				botLogger.error("Update Error:", ctx.error);
			});

		await conn.start();
		instance = conn;

		await this.init(instance);
	},
	async init(instance: Bot) {
		try {
			instance.api
				.setMyCommands({
					commands: [{ command: "start", description: "Начать" }],
				})
				.catch((e) => botLogger.error(e));

			initCommands(instance);
		} catch (e) {
			botLogger.error("Bot initialization failed:", e);
		}
	},
};
