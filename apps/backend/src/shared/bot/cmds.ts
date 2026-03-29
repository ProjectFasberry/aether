import type { Bot } from "gramio";
import {
	backendInfoCmdCb,
	botInfoCmdCb,
	publicStartCmdCb,
	revalidateChatsCmdCb,
	revalidateUrlsCmdCb,
	serverAlertCmdCb,
	startCmdCb,
	statusCmdCb,
	updateSkinCmdCb,
	forceUpdateWatchtower,
} from "./lib";

type CommandHandler = Parameters<Bot["command"]>[1];
export type CommandCtx = Parameters<CommandHandler>[0];

type GuardCommand = {
	name: string;
	description?: string;
	handler: (ctx: CommandCtx) => Promise<void>;
	publicHandler?: (ctx: CommandCtx) => Promise<void>;
};

export const GUARD_COMMANDS: GuardCommand[] = [
	{
		name: "start",
		description: "Запустить бота",
		handler: startCmdCb,
		publicHandler: publicStartCmdCb,
	},
	{
		name: "status",
		description: "Статус",
		handler: statusCmdCb,
	},
	{
		name: "updateskin",
		description: "Обновить скины игроков",
		handler: updateSkinCmdCb,
	},
	{
		name: "botinfo",
		description: "Информация о боте",
		handler: botInfoCmdCb,
	},
	{
		name: "backendinfo",
		description: "Информация о бекенде",
		handler: backendInfoCmdCb,
	},
	{
		name: "alert",
		description: "Объявление на сервере",
		handler: serverAlertCmdCb,
	},
	{
		name: "revalidatechats",
		description: "Обновить чаты (конфиг)",
		handler: revalidateChatsCmdCb,
	},
	{
		name: "revalidateurls",
		description: "Обновить юрлы (конфиг)",
		handler: revalidateUrlsCmdCb,
	},
	{
		name: "forceupdate",
		description: "Обновить образы",
		handler: forceUpdateWatchtower,
	},
];
