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

export type GithubWorkflowRunPayload = {
	action?: string
	repository?: { full_name?: string; html_url?: string }
	sender?: { login?: string }
	workflow_run?: {
		name?: string
		conclusion?: string | null
		head_branch?: string | null
		html_url?: string
		event?: string
		run_number?: number
		head_commit?: { message?: string; id?: string } | null
	}
}

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

export function formatGithubWorkflowRun(payload: GithubWorkflowRunPayload) {
	const repo = payload.repository?.full_name ?? "unknown repository"
	const workflow = payload.workflow_run?.name ?? "workflow"
	const conclusion = payload.workflow_run?.conclusion ?? "unknown"
	const branch = payload.workflow_run?.head_branch ?? "unknown branch"
	const runNumber = payload.workflow_run?.run_number
	const actor = payload.sender?.login ?? "unknown"
	const message = (payload.workflow_run?.head_commit?.message ?? "").split("\n")[0]?.trim()
	const url = payload.workflow_run?.html_url ?? payload.repository?.html_url

	const plain = [
		`❌ ${repo} · ${workflow}`,
		`🌿 ${branch}${runNumber ? ` · #${runNumber}` : ""} · ${conclusion}`,
		`👤 ${actor}`,
		message ? `📝 ${message}` : null,
		url ? `🔗 ${url}` : null,
	].filter(Boolean).join("\n")

	const html = [
		`❌ <b>${escapeHtml(repo)}</b> · ${escapeHtml(workflow)}`,
		`🌿 <i>${escapeHtml(branch)}</i>${runNumber ? ` · #${runNumber}` : ""} · ${escapeHtml(conclusion)}`,
		`👤 ${escapeHtml(actor)}`,
		message ? `📝 ${escapeHtml(message)}` : null,
		url ? `🔗 <a href="${escapeHtml(url)}">run</a>` : null,
	].filter(Boolean).join("\n")

	return { plain, html }
}

/** Shared fan-out: Gotify mirror plus the infrastructure Telegram chat. */
async function fanOut(title: string, plain: string, html: string): Promise<void> {
	void sendGotify(title, plain)

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

/** GitHub push fan-out. */
export async function sendGithubPush(payload: GithubPushPayload): Promise<void> {
	const { plain, html } = formatGithubPush(payload)

	await fanOut("GitHub push", plain, html)
}

/** Failed workflow run fan-out. */
export async function sendGithubWorkflowRun(payload: GithubWorkflowRunPayload): Promise<void> {
	const { plain, html } = formatGithubWorkflowRun(payload)

	await fanOut("GitHub workflow failed", plain, html)
}
