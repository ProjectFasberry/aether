import { bot } from "../bot"
import { chats } from "../bot/chats"
import { getEnv } from "../env"
import { appLogger } from "../logger"
import { sendGotify } from "./gotify"

export type GithubPushPayload = {
	ref?: string
	compare?: string
	deleted?: boolean
	repository?: { full_name?: string; html_url?: string }
	sender?: { login?: string }
	head_commit?: { message?: string; url?: string } | null
}

const HTML_ESCAPE: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] ?? char)

export function formatGithubPush(payload: GithubPushPayload) {
	const repo = payload.repository?.full_name ?? "unknown repository"
	const branch = (payload.ref ?? "").replace(/^refs\/heads\//, "") || "unknown branch"
	const actor = payload.sender?.login ?? "unknown"
	const message = (payload.head_commit?.message ?? "").split("\n")[0]?.trim() || "(no message)"
	const url = payload.head_commit?.url ?? payload.compare ?? payload.repository?.html_url

	const plain = [
		`🚀 ${repo} · ${branch}`,
		`👤 ${actor}`,
		`📝 ${message}`,
		url ? `🔗 ${url}` : null,
	].filter(Boolean).join("\n")

	const html = [
		`🚀 <b>${escapeHtml(repo)}</b> · <i>${escapeHtml(branch)}</i>`,
		`👤 ${escapeHtml(actor)}`,
		`📝 ${escapeHtml(message)}`,
		url ? `🔗 <a href="${escapeHtml(url)}">commit</a>` : null,
	].filter(Boolean).join("\n")

	return { plain, html }
}

/** GitHub push fan-out: Gotify mirror plus the infrastructure Telegram chat. */
export async function sendGithubPush(payload: GithubPushPayload): Promise<void> {
	const { plain, html } = formatGithubPush(payload)

	void sendGotify("GitHub push", plain)

	const instance = bot.getOptionalInstance()
	if (!instance) {
		appLogger.warn("github webhook: bot is not ready, telegram skipped")
		return
	}

	const target = getEnv().GITHUB_TG_TARGET ?? "g_infra"
	const chatId = chats.getChatIdByTarget(target)
	if (!chatId) {
		appLogger.warn(`github webhook: telegram target ${target} is not configured`)
		return
	}

	try {
		await instance.api.sendMessage({
			chat_id: chatId,
			text: html,
			parse_mode: "HTML",
		})
	} catch (error) {
		appLogger.error(`github webhook: telegram send failed: ${String(error)}`)
	}
}
