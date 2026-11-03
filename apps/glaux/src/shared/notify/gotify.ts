import { getEnv } from "../env";
import { appLogger } from "../logger";

/**
 * Mirror of the Telegram alerts: the launcher, the API and the bots report
 * failures by publishing `INTERNAL.HEALTH` on NATS, and glaux is the single
 * place that fans those out to the chat channels. Gotify is optional: without
 * `GOTIFY_URL`/`GOTIFY_TOKEN` the alerts only go to Telegram.
 */
export async function sendGotify(title: string, message: string): Promise<void> {
	const { GOTIFY_URL, GOTIFY_TOKEN } = getEnv();

	if (!GOTIFY_URL || !GOTIFY_TOKEN) return;

	try {
		const response = await fetch(`${GOTIFY_URL.replace(/\/$/, "")}/message`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"X-Gotify-Key": GOTIFY_TOKEN,
			},
			body: JSON.stringify({ title, message, priority: 5 }),
		});

		if (!response.ok) {
			appLogger.error(`gotify rejected the alert: ${response.status} ${await response.text()}`);
		}
	} catch (error) {
		// Alerting must never take the service down.
		appLogger.error(`gotify alert failed: ${String(error)}`);
	}
}
