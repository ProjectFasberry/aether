import { SERVICE_NAME } from "../const/internal";
import { logger } from "../logger";
import { nats } from "../nats/client";
import { SUBJECTS } from "../nats/subjects";

export async function handleProcessOnEvent(
	sub: string,
	{
		error,
		kill = true,
	}: {
		error: Error | unknown;
		kill?: boolean;
	},
) {
	logger.error(handleProcessOnEvent.name, sub, error);

	//#region todo: impl logging/alerting using fluentbit + grafana
	const nc = nats.getInstance();
	const msg = error instanceof Error ? error.message : `UNKNOWN: ${error}`;

	try {
		nc.publish(
			SUBJECTS.INTERNAL.HEALTH,
			JSON.stringify({
				data: msg,
				timestamp: Date.now(),
				from: SERVICE_NAME,
			}),
		);

		await Promise.race([
			nc.flush(),
			new Promise((_, reject) => setTimeout(() => reject(new Error("NATS Timeout")), 1000)),
		]);

		await nc.close();
	} catch (e) {
		console.error("Failed to send alert to NATS:", e);
	}
	//#endregion

	if (kill) {
		process.exit(1);
	}
}
