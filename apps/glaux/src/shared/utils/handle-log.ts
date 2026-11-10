import { SERVICE_NAME } from "../const/internal";
import { logger } from "../logger";
import { normalizeError } from "@repo/shared/utils";
import { natsService } from "../nats/client";
import { SUBJECTS } from "../nats/subjects";

/**
 * Publishes a health alert without closing NATS. Used by the lifecycle hook,
 * where the connection must survive until the rollback finishes.
 */
export async function publishHealthAlert(data: string): Promise<void> {
	const nc = natsService.getOptionalInstance();
	if (!nc || nc.isClosed()) return;

	try {
		nc.publish(
			SUBJECTS.INTERNAL.HEALTH,
			JSON.stringify({ data, timestamp: Date.now(), from: SERVICE_NAME }),
		);

		await Promise.race([
			nc.flush(),
			new Promise((_, reject) => setTimeout(() => reject(new Error("NATS Timeout")), 1000)),
		]);
	} catch (e) {
		logger.error(`Failed to send alert to NATS: ${normalizeError(e)}`);
	}
}

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
	logger.error(`${sub}: ${normalizeError(error)}`);

	//#region todo: impl logging/alerting using fluentbit + grafana
	const nc = natsService.getInstance();
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
		logger.error(`Failed to send alert to NATS: ${normalizeError(e)}`);
	}
	//#endregion

	if (kill) {
		process.exit(1);
	}
}
