import type { Bot } from "gramio";
import {
	backendInfoCmdCb,
	botInfoCmdCb,
	publicStartCmdCb,
	revalidateChatsCmdCb,
	revalidateUrlsCmdCb,
	serverAlertCmdCb,
	startCmdCb,
	updateSkinCmdCb,
	forceUpdateWatchtower,
	statusCmdCb,
} from "./lib";

export type CommandCtx = Parameters<Parameters<Bot["command"]>[1]>[0];

type GuardCommand = {
	name: string;
	description?: string;
	handlers?: {
		public?: (ctx: CommandCtx) => Promise<void>;
		private?: (ctx: CommandCtx) => Promise<void>;
	};
};

export const GUARD_COMMANDS: GuardCommand[] = [
	{
		name: "start",
		description: "Start bot",
		handlers: {
			public: publicStartCmdCb,
			private: startCmdCb,
		},
	},
	{
		name: "status",
		description: "Current status",
		handlers: {
			private: statusCmdCb,
		},
	},
	{
		name: "updateskin",
		description: "Update players skin",
		handlers: {
			private: updateSkinCmdCb,
		},
	},
	{
		name: "botinfo",
		description: "Bot info",
		handlers: {
			private: botInfoCmdCb,
		},
	},
	{
		name: "backendinfo",
		description: "Service info",
		handlers: {
			private: backendInfoCmdCb,
		},
	},
	{
		name: "alert",
		description: "Alert on game server",
		handlers: {
			private: serverAlertCmdCb,
		},
	},
	{
		name: "revalidatechats",
		description: "Update chats config",
		handlers: {
			private: revalidateChatsCmdCb,
		},
	},
	{
		name: "revalidateurls",
		description: "Update urls config",
		handlers: {
			private: revalidateUrlsCmdCb,
		},
	},
	{
		name: "forceupdate",
		description: "Force updating images",
		handlers: {
			private: forceUpdateWatchtower,
		},
	},
];
