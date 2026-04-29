import type { Bot } from "gramio";
import {
	backendInfoCmdCb,
	botInfoCmdCb,
	publicStartCmdCb,
	revalidateChatsCmdCb,
	revalidateUrlsCmdCb,
	serverAlertCmdCb,
	startCmdCb,
	// statusCmdCb,
	// updateSkinCmdCb,
	forceUpdateWatchtower,
} from "./lib";
import { chats } from "./chats";
import { botLogger } from "../logger";

export type CommandCtx = Parameters<Parameters<Bot["command"]>[1]>[0];

type GuardCommand = {
	name: string;
	description?: string;
	handler: (ctx: CommandCtx) => Promise<void>;
	publicHandler?: (ctx: CommandCtx) => Promise<void>;
};

export const GUARD_COMMANDS: GuardCommand[] = [
	{
		name: "start",
		description: "Start bot",
		handler: startCmdCb,
		publicHandler: publicStartCmdCb,
	},
	// {
	// 	name: "status",
	// 	description: "Current status",
	// 	handler: statusCmdCb,
	// },
	// {
	// 	name: "updateskin",
	// 	description: "Update players skin",
	// 	handler: updateSkinCmdCb,
	// },
	{
		name: "botinfo",
		description: "Bot info",
		handler: botInfoCmdCb,
	},
	{
		name: "backendinfo",
		description: "Service info",
		handler: backendInfoCmdCb,
	},
	{
		name: "alert",
		description: "Alert on game server",
		handler: serverAlertCmdCb,
	},
	{
		name: "revalidatechats",
		description: "Update chats config",
		handler: revalidateChatsCmdCb,
	},
	{
		name: "revalidateurls",
		description: "Update urls config",
		handler: revalidateUrlsCmdCb,
	},
	{
		name: "forceupdate",
		description: "Force updating images",
		handler: forceUpdateWatchtower,
	},
];

export function initCommands(bot: Bot) {
	function validateChatId(chatId: string | number) {
		const list = chats.get();
		return list.includes(chatId.toString());
	}

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
