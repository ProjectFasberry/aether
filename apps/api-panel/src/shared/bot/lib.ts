import { format } from "gramio";
// import { bot as botService } from ".";
import { type CommandCtx, GUARD_COMMANDS } from "./cmds";
import { Keyboard } from "gramio";
import { chats } from "./chats";
import { botLogger } from "../logger";
import { urls } from "./urls";
import { rcon } from "../rcon/client";
import { env } from "../env";
import { wrapError } from "@repo/shared/lib/utils";

export async function botInfoCmdCb(ctx: CommandCtx) {
	const commandsList = GUARD_COMMANDS.map((cmd) => {
		return `${cmd.publicHandler ? "🌍" : "🔐"} <code>/${cmd.name}</code>`;
	}).join("\n");

	const message = format`
<b>🤖 Info about the commands</b>

Handlers uploaded: <code>${GUARD_COMMANDS.length}</code>

${commandsList}

<i>🔐 — only privated chats
🌍 — public available</i>
  `;

	await ctx.send(message, { parse_mode: "HTML" });
	await ctx.delete().catch(() => {});
}

export async function backendInfoCmdCb(ctx: CommandCtx) {
	const urlsEntries = Array.from(urls.get().entries());
	const chatsList = chats.get();

	const urlsText =
		urlsEntries.length > 0 ? urlsEntries.map(([key, val]) => `• <code>${key}</code>: ${val}`).join("\n") : "пусто";

	const chatsText = chatsList.length > 0 ? chatsList.map((id) => `• <code>${id}</code>`).join("\n") : "пусто";

	const message = format`
🖥 Backend Information

🔗 Endpoints:
${urlsText}

💬 Whitelisted Chats:
${chatsText}
    `;

	await ctx.send(message, { parse_mode: "HTML" });
	await ctx.delete().catch(() => {});
}

export async function revalidateChatsCmdCb(ctx: CommandCtx) {
	const result = await chats.revalidate();

	if (!result.ok) {
		const errorMessage = wrapError(result.error).error;

		ctx.send(
			format`
            ❌ <b>Error in chats updating</b>

            <code>${errorMessage}</code>
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
        • Было в памяти: <code>${prev}</code>
        • Загружено сейчас: <code>${upd}</code>
        • Изменение: <code>${diffText}</code>
    `;

	await ctx.send(message, { parse_mode: "HTML" });
	await ctx.delete().catch(() => {});
}

export async function revalidateUrlsCmdCb(ctx: CommandCtx) {
	const result = await urls.revalidate();

	if (!result.ok) {
		const errorMessage = wrapError(result.error).error;

		ctx.send(
			format`
      ❌ <b>Error urls revalidating</b>

      <code>${errorMessage}</code>
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
    • Было: <code>${prev}</code>
    • Стало: <code>${upd}</code>
    • Изменение: <code>${diffText}</code>
  `;

	await ctx.send(message, { parse_mode: "HTML" });
	await ctx.delete().catch(() => {});
}

// type TaskResult = boolean | Map<string, boolean>;

// export async function updateSkinCmdCb(ctx: CommandCtx) {
// 	const [targetPlayer] = ctx.args?.split(/\s+/) ?? [];
// 	const chatId = ctx.chat.id.toString();

// 	const BATCH_OPTS = { batchSize: 1000, conc: 100 };

// 	const isSinglePlayer = Boolean(targetPlayer);

// 	const taskFn = isSinglePlayer
// 		? () => initPlayerSkin(targetPlayer!)
// 		: () => updatePlayersSkins(BATCH_OPTS.conc, BATCH_OPTS.batchSize);

// 	const startNotice = isSinglePlayer
// 		? `🚀 Обновление скина игрока: <code>${targetPlayer}</code>`
// 		: `🚀 Массовое обновление скинов (batch: ${BATCH_OPTS.batchSize}, conc: ${BATCH_OPTS.conc})`;

// 	executeBackgroundTask(ctx, chatId, taskFn, startNotice);

// 	await ctx.delete().catch(() => { });
// }

// async function executeBackgroundTask<T>(
// 	ctx: CommandCtx,
// 	chatId: string,
// 	fn: () => Promise<TaskResult>,
// 	startMsg: string,
// ) {
// 	try {
// 		await ctx.send(startMsg, { parse_mode: "HTML" });

// 		const result = await fn();

// 		let resultText: string;

// 		if (result instanceof Map) {
// 			const values = Array.from(result.values());
// 			const successCount = values.filter((v) => v === true).length;
// 			resultText = `✅ Завершено. Успешно: ${successCount}/${values.length}`;
// 		} else {
// 			resultText = result ? "✅ Успешно завершено" : "❌ Ошибка при выполнении";
// 		}

// 		const bot = botService.get();

// 		await bot.api.sendMessage({
// 			chat_id: chatId,
// 			text: `📊 <b>Результат задачи:</b>\n${resultText}`,
// 			parse_mode: "HTML",
// 		});
// 	} catch (e) {
// 		botLogger.error(e);

// 		const bot = botService.get();

// 		await bot.api
// 			.sendMessage({
// 				chat_id: chatId,
// 				text: `❌ <b>Критическая ошибка задачи</b>\n<code>${String(e)}</code>`,
// 				parse_mode: "HTML",
// 			})
// 			.catch(() => { });
// 	}
// }

// export async function statusCmdCb(ctx: CommandCtx) {
// 	const status = await getServerStatus({});

// 	const proxyInfo = status?.proxy ? `${status.proxy.online}/${status.proxy.max}` : "n/a";

// 	const serversEntries = Object.entries(status?.servers ?? {});
// 	const serversText =
// 		serversEntries.length > 0
// 			? serversEntries.map(([name, data]) => `• ${name}: ${data.online}/${data.max}`).join("\n")
// 			: "n/a";

// 	const message = format`
// 📊 Статус серверов

// 🌐 Общий онлайн: <code>${proxyInfo}</code>

// 🖥 Детализация:
// ${serversText}
//     `;

// 	await ctx.send(message, { parse_mode: "HTML" });
// 	await ctx.delete().catch(() => { });
// }

export function getCommandName(ctx: CommandCtx, fallback: string = "command"): string {
	// @ts-expect-error
	if (ctx.info?.name) return ctx.info.name;
	if ((ctx as any).command) return (ctx as any).command;
	if (ctx.text) return ctx.text.split(/\s+/)[0].slice(1).split("@")[0];
	return fallback;
}

export async function serverAlertCmdCb(ctx: CommandCtx) {
	const alertMessage = ctx.args?.trim();

	if (!alertMessage) {
		const cmdName = getCommandName(ctx, "alert");

		ctx.send(
			format`
            ⚠️ <b>Отсутствует текст объявления</b>

            Using: <code>/${cmdName} [msg]</code>

            <i>Example: /${cmdName} Сервер будет перезагружен через 5 минут</i>
        `,
			{ parse_mode: "HTML" },
		);

		return;
	}

	const client = rcon.get();

	try {
		const result = await client.send(`alert ${alertMessage}`);

		const report = format`
            📢 <b>Объявление отправлено на сервер</b>

            📝 Текст: <code>${alertMessage}</code>
            🖥 Ответ сервера: <code>${result || "ok"}</code>
        `;

		await ctx.send(report, { parse_mode: "HTML" });
	} catch (e) {
		botLogger.error(e);
		await ctx.send(`❌ <b>Error RCON:</b> <code>${String(e)}</code>`, { parse_mode: "HTML" });
	}

	await ctx.delete().catch(() => {});
}

export async function startCmdCb(ctx: CommandCtx) {
	const commandsForMenu = GUARD_COMMANDS.filter((cmd) => cmd.description).map((cmd) => ({
		command: cmd.name,
		description: cmd.description,
	}));

	const kb = new Keyboard()
		.columns(2)
		.add(...commandsForMenu.map((cmd) => Keyboard.text(`/${cmd.command}`)))
		.resized();

	const commandsList = commandsForMenu.map((x) => `• <b>/${x.command}</b> — <i>${x.description}</i>`).join("\n");

	const welcomeText = format`
👋 <b>Welcome to the admin-panel</b>

Commands available:
${commandsList}

<i>Select a command on the keyboard or input it manually.</i>
    `;

	await ctx.send(welcomeText, {
		reply_markup: kb,
		parse_mode: "HTML",
	});

	await ctx.delete().catch(() => {});
}

export async function publicStartCmdCb(ctx: CommandCtx) {
	await ctx.send("Hi! Fasberry project is available: https://fasberry.fun");
	await ctx.delete().catch(() => {});
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
		await ctx.send(`Network error ${JSON.stringify(e)}`);
	}
}
