import { createHash } from "node:crypto";
import { general } from "#/shared/database/general-db";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "#/shared/nats/subjects";
import { authLogger } from "./auth.model";

export type LoginEventInput = {
	nickname: string;
	ip: string;
	browser: string;
	os: string;
	platform: string;
	client: "web" | "launcher";
};

export type LoginEvent = {
	id: number;
	nickname: string;
	ip: string;
	browser: string;
	os: string;
	platform: string;
	client: string;
	new_device: boolean;
	created_at: Date;
};

/**
 * A device is the browser/OS/platform triple. The client is part of the key so
 * a launcher login does not mark the web session as the same device; launcher
 * requests carry no User-Agent, so their first login is the baseline.
 */
function deviceKey(input: LoginEventInput): string {
	// Browser and OS minors change on every update; only the family identifies
	// the device, otherwise every Chrome update looks like a new login.
	const family = (value: string) => value.replace(/\s+\d.*$/, "").trim() || "unknown";

	return createHash("sha256")
		.update([input.client, family(input.browser), family(input.os), input.platform].join("|"))
		.digest("hex");
}

export function displayBrowser(browser: { name?: string; version?: string }): string {
	return [browser.name, browser.version].filter(Boolean).join(" ") || "unknown";
}

export function displayOs(os: { name?: string; versionName?: string }): string {
	return [os.name, os.versionName].filter(Boolean).join(" ") || "unknown";
}

export function displayPlatform(platform: { type?: string }): string {
	return platform.type || "unknown";
}

/**
 * Records a successful login and reports whether this account has never used
 * that device before. Best effort by design: a database hiccup must not fail a
 * login, so the caller catches and logs.
 */
export async function recordLoginEvent(input: LoginEventInput): Promise<boolean> {
	const key = deviceKey(input);

	const previous = await general
		.selectFrom("auth_login_events")
		.select("id")
		.where("nickname", "=", input.nickname)
		.where("device_key", "=", key)
		.executeTakeFirst();

	const isNew = !previous;

	await general
		.insertInto("auth_login_events")
		.values({
			nickname: input.nickname,
			ip: input.ip,
			browser: input.browser,
			os: input.os,
			platform: input.platform,
			client: input.client,
			device_key: key,
			new_device: isNew,
		})
		.execute();

	if (isNew) {
		// The Telegram/e-mail delivery is added with the recovery work; the
		// event is stable and already carries everything a notifier needs.
		try {
			natsService.getInstance().publish(
				SUBJECTS.EVENTS.AUTHORIZATION.LOGIN_NEW_DEVICE,
				JSON.stringify({
					nickname: input.nickname,
					ip: input.ip,
					browser: input.browser,
					os: input.os,
					platform: input.platform,
					client: input.client,
					created_at: new Date().toISOString(),
				}),
			);
		} catch (error) {
			authLogger.warn(`failed to publish new-device event for ${input.nickname}: ${String(error)}`);
		}
	}

	return isNew;
}

export async function getLoginHistory(nickname: string, limit = 20): Promise<LoginEvent[]> {
	const rows = await general
		.selectFrom("auth_login_events")
		.select([
			"id",
			"nickname",
			"ip",
			"browser",
			"os",
			"platform",
			"client",
			"new_device",
			"created_at",
		])
		.where("nickname", "=", nickname)
		.orderBy("created_at", "desc")
		.limit(Math.min(Math.max(limit, 1), 50))
		.execute();

	return rows.map((row) => ({ ...row, id: Number(row.id) }));
}
