import { format } from "gramio";
import { bot } from ".";
import { type CommandCtx, GUARD_COMMANDS } from "./cmds";
import { Keyboard } from "gramio";
import { chats } from "./chats";
import { urlsService } from "./urls";
import { rcon } from "../rcon/client";
import { env } from "../env";
import { wrapError } from "@repo/shared/lib/utils";
import { createSkinsService } from "@repo/core/modules/skins/index";
import { general as generalDb, skins as skinsDb } from "../database";
import { nats } from "../nats/client";
import { redis } from "../redis/client";
import { minio } from "../minio/client";
import { createServerStatusService } from "@repo/core/modules/status/index";
import { logger } from "../logger";

const skinsService = createSkinsService({
	databases: {
		general: generalDb,
		skins: skinsDb,
	},
	config: {
		VOLUME_URL: env.VOLUME_URL,
	},
	redis: redis.getInstance,
});

const serverStatusService = createServerStatusService({
	generalDb,
	config: {
		VOLUME_URL: env.VOLUME_URL,
	},
});

export async function botInfoCmdCb(ctx: CommandCtx) {
	const cmdsList = GUARD_COMMANDS.map((cmd) => `${cmd.handlers?.public ? "🌍" : "🔐"} <code>/${cmd.name}</code>`).join(
		"\n",
	);

	const message = format`
    <b>🤖 Info about the commands</b>

    Handlers uploaded: <code>${GUARD_COMMANDS.length}</code>

    ${cmdsList}

    <i>🔐 — only privated chats
    🌍 — public available</i>
  `;

	await ctx.send(message, { parse_mode: "HTML" });
}

export async function backendInfoCmdCb(ctx: CommandCtx) {
	const urlsEntries = Array.from(urlsService.getData().entries());
	const chatsList = chats.getData();

	const urlsText =
		urlsEntries.length > 0 ? urlsEntries.map(([key, val]) => `• <code>${key}</code>: ${val}`).join("\n") : "empty";

	const chatsText = chatsList.length > 0 ? chatsList.map((id) => `• <code>${id}</code>`).join("\n") : "empty";

	const message = format`
    🖥 Backend Information

    🔗 Endpoints: ${urlsText}

    💬 Whitelisted Chats: ${chatsText}
  `;

	await ctx.send(message, { parse_mode: "HTML" });
}

export async function revalidateChatsCmdCb(ctx: CommandCtx) {
	const result = await chats.revalidate();

	if (!result.ok) {
		const errorMsg = wrapError(result.error).error;

		ctx.send(
			format`
        <b>Error in chats updating</b>
        <code>${errorMsg}</code>
        `,
			{ parse_mode: "HTML" },
		);

		return;
	}

	const { prev, upd } = result.data;
	const diff = upd - prev;
	const diffText = diff >= 0 ? `+${diff}` : `${diff}`;

	const message = format`
    ✅ <b>Chats list updated</b>

    📊 Result:
    before: <code>${prev}</code>
    after: <code>${upd}</code>
    changed: <code>${diffText}</code>
  `;

	await ctx.send(message, { parse_mode: "HTML" });
}

export async function revalidateUrlsCmdCb(ctx: CommandCtx) {
	const result = await urlsService.revalidate({
		onError: (e) => {
			logger.error("Urls revalidation error", e);
		},
	});

	if (!result.ok) {
		const errorMsg = wrapError(result.error).error;

		await ctx.send(
			format`
        <b>Error urls revalidating</b>
        <code>${errorMsg}</code>
      `,
			{ parse_mode: "HTML" },
		);

		return;
	}

	const { prev, upd } = result.data;
	const diff = upd - prev;
	const diffText = diff >= 0 ? `+${diff}` : `${diff}`;

	const message = format`
    ✅ <b>Urls updated</b>

    📊 Result:
    before: <code>${prev}</code>
    after: <code>${upd}</code>
    changed: <code>${diffText}</code>
  `;

	await ctx.send(message, { parse_mode: "HTML" });
}

export async function updateSkinCmdCb(ctx: CommandCtx) {
	const [nickname] = ctx.args?.split(/\s+/) ?? [];
	const chatId = ctx.chat.id.toString();

	const opts = {
		batchSize: 1000,
		concurrency: 100,
	};

	const updateVariant = nickname && nickname.trim().length > 0 ? "single" : "all";

	const singleCb = () =>
		skinsService.skin.initSkin({
			nickname,
			minio: minio.getInstance,
			onStart() {
				bot.logger.log(`Start updating skin for ${nickname}`);
			},
			async onFinish() {
				const botClient = bot.getInstance();

				await botClient.api.sendMessage({
					chat_id: chatId,
					text: `📊 Success for ${nickname}`,
					parse_mode: "HTML",
				});
			},
			onError(e) {
				bot.logger.error(`Skin ${nickname} updating error`, e);
			},
		});

	const multiCb = () =>
		skinsService.skin.updateSkins({
			...opts,
			minio: minio.getInstance,
			nats: nats.getInstance,
			onStart() {
				bot.logger.log("Start updating skins all users");
			},
			async onSuccess(processedCount) {
				const botClient = bot.getInstance();

				await botClient.api.sendMessage({
					chat_id: chatId,
					text: `📊 Success updating ${processedCount} users`,
					parse_mode: "HTML",
				});
			},
			onSuccessPlayer(nickname) {
				bot.logger.log(`Skin ${nickname} updated`);
			},
			onError(e) {
				bot.logger.error(`Skins updating error`, e);
			},
			onErrorPlayer(nickname, e) {
				bot.logger.error(`Skin ${nickname} updating error`, e);
			},
		});

	const taskFn = updateVariant === "single" ? singleCb : multiCb;

	const startNotice =
		updateVariant === "single"
			? `Updating the player skin: <code>${nickname}</code>`
			: `Mass update of skins\nParameters: ${JSON.stringify(opts, null, 1)}`;

	try {
		await ctx.send(startNotice, { parse_mode: "HTML" });
		await taskFn();
	} catch (e) {
		const payload = {
			chat_id: chatId,
			text: `❌ <b>Error</b>\n<code>${String(e)}</code>`,
			parse_mode: "HTML",
		} as const;

		await bot
			.getInstance()
			.api.sendMessage(payload)
			.catch(() => {});
	}
}

export async function statusCmdCb(ctx: CommandCtx) {
	const status = await serverStatusService.getData({ redis: redis.getInstance });

	const proxyInfo = status?.proxy ? `${status.proxy.online}/${status.proxy.max}` : "n/a";

	const serversEntries = Object.entries(status?.servers ?? {});
	const serversText =
		serversEntries.length > 0
			? serversEntries.map(([name, data]) => `• ${name}: ${data.online}/${data.max}`).join("\n")
			: "n/a";

	const message = format`
    📊 Server status
    🌐 Global online: <code>${proxyInfo}</code>
    🖥 Details:
    ${serversText}
  `;

	await ctx.send(message, { parse_mode: "HTML" });
}

export function getCommandName(ctx: CommandCtx, fallback: string = "command"): string {
	// @ts-expect-error
	if (ctx.info?.name) return ctx.info.name;
	if ((ctx as any).command) return (ctx as any).command;
	if (ctx.text) return ctx.text.split(/\s+/)[0].slice(1).split("@")[0];
	return fallback;
}

export async function serverAlertCmdCb(ctx: CommandCtx) {
	const alertMsg = ctx.args?.trim();

	if (!alertMsg) {
		const cmdName = getCommandName(ctx, "alert");

		ctx.send(
			format`
        ⚠️ <b>Text is missing</b>
        Using: <code>/${cmdName} [msg]</code>
        <i>Example: /${cmdName} Сервер будет перезагружен через 5 минут</i>
        `,
			{ parse_mode: "HTML" },
		);

		return;
	}

	try {
		const rconClient = rcon.getInstance();
		const result = await rconClient.send(`alert ${alertMsg}`);

		const report = format`
      📢 <b>Broadcast will be sent on the server</b>
      📝 Text: <code>${alertMsg}</code>
      🖥 Response: <code>${result || "ok"}</code>
    `;

		await ctx.send(report, { parse_mode: "HTML" });
	} catch (e) {
		console.error(e);
		await ctx.send(`<b>Error RCON:</b> <code>${String(e)}</code>`, { parse_mode: "HTML" });
	}
}

export async function startCmdCb(ctx: CommandCtx) {
	const commandsForMenu = GUARD_COMMANDS.filter((cmd) => cmd.description).map((cmd) => ({
		command: cmd.name,
		description: cmd.description,
	}));

	const commandsList = commandsForMenu.map((x) => `<b>/${x.command}</b> — <i>${x.description}</i>`).join("\n");

	const welcomeText = format`
    👋 <b>Welcome</b>

    Commands available:
    ${commandsList}

    <i>Select a command on the keyboard or input it manually.</i>
  `;

	const kb = new Keyboard()
		.columns(2)
		.add(...commandsForMenu.map((cmd) => Keyboard.text(`/${cmd.command}`)))
		.resized();

	await ctx.send(welcomeText, {
		reply_markup: kb,
		parse_mode: "HTML",
	});
}

export async function publicStartCmdCb(ctx: CommandCtx) {
	await ctx.send("Hi! Fasberry project is available: https://fasberry.fun");
	await ctx.delete({ message_id: ctx.id }).catch(() => {});
}

export async function forceUpdateWatchtower(ctx: CommandCtx) {
	try {
		const url = `http://${env.WATCHTOWER_HOST}:${env.WATCHTOWER_PORT}/v1/update`;

		const res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.WATCHTOWER_API_TOKEN}`,
			},
			tls: {
				rejectUnauthorized: false,
			},
		});

		if (res.ok) {
			const text = await res.text();
			await ctx.send(`Signal sent: ${text}`);
		} else {
			await ctx.send(`Watchtower error ${res.status}`);
		}
	} catch (e) {
		bot.logger.error("Network error", e);
		await ctx.send(`Network error`);
	}
}
