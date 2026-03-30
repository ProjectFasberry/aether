import { sql } from "kysely";
import { general } from "../database";
import { appLogger } from "../logger";
import { invariant } from "@repo/shared/lib/utils";

let CHATS: readonly string[] | null = null;
let isRefreshing = false;

async function fetchChatIds() {
	const rows = await general
		.selectFrom("tg_logs_chats")
		.select("chat_id")
		.orderBy(sql`CASE WHEN chat_id LIKE '-%' THEN 0 ELSE 1 END`)
		.execute();

	return rows.map((d) => d.chat_id);
}

async function updateChatsInternal() {
	const prev = CHATS?.length ?? 0;
	const newData = await fetchChatIds();
	CHATS = Object.freeze(newData);
	return { prev, current: CHATS.length };
}

export async function initChats() {
	if (CHATS !== null) return;

	try {
		const { current } = await updateChatsInternal();
		appLogger.success(`Telegram chats initialized. Loaded ${current} chats.`);
	} catch (e) {
		appLogger.error(e);
		throw e;
	}
}

export async function revalidateChats(): Promise<
	{ ok: true; data: { upd: number; prev: number } } | { ok: false; error: Error | unknown }
> {
	if (isRefreshing) return { ok: false, error: new Error("Refresh already in progress") };

	isRefreshing = true;

	try {
		const { prev, current } = await updateChatsInternal();
		return { ok: true as const, data: { upd: current, prev } };
	} catch (e) {
		appLogger.error("Revalidation failed:", e);
		return { ok: false as const, error: e };
	} finally {
		isRefreshing = false;
	}
}

export function getChats() {
	invariant(CHATS, "Chats are not defined. Call initChats() first.");
	if (CHATS.length === 0) appLogger.warn("Chats list is empty");
	return CHATS;
}
