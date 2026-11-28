import type { NatsConnection } from "@nats-io/nats-core";
import { safeJsonParse } from "@repo/shared/utils";
import { logErrorMsg } from "#/shared/observability/log";
import {
	confirmTwoFactorSetup,
	startTwoFactorSetup,
} from "#/modules/auth/two-factor.model";

type Payload = {
	nickname?: string;
	code?: string;
};

/**
 * Request/reply bridge for the in-game `/2fa` command. The game server is a
 * trusted NATS member and sends the nickname of the player who typed the
 * command; the API never accepts a nickname from the player directly.
 */
async function handleTwoFactor(message: import("@nats-io/nats-core").Msg): Promise<void> {
	const parsed = safeJsonParse<Payload>(new TextDecoder().decode(message.data));
	if (!parsed.ok || typeof parsed.value.nickname !== "string") {
		message.respond(JSON.stringify({ error: "INVALID_REQUEST" }));
		return;
	}

	const nickname = parsed.value.nickname;
	const action = message.subject.split(".").pop();

	try {
		if (action === "setup") {
			const data = await startTwoFactorSetup(nickname);
			if (!data) {
				message.respond(JSON.stringify({ error: "NOT_FOUND" }));
				return;
			}

			message.respond(JSON.stringify(data));
			return;
		}

		if (action === "confirm") {
			if (typeof parsed.value.code !== "string") {
				message.respond(JSON.stringify({ error: "INVALID_CODE" }));
				return;
			}

			const backupCodes = await confirmTwoFactorSetup(nickname, parsed.value.code);
			if (!backupCodes) {
				message.respond(JSON.stringify({ error: "INVALID_CODE" }));
				return;
			}

			message.respond(JSON.stringify({ backupCodes }));
			return;
		}

		message.respond(JSON.stringify({ error: "UNKNOWN_ACTION" }));
	} catch (e) {
		const reason = e instanceof Error ? e.message : "INTERNAL_ERROR";
		message.respond(JSON.stringify({ error: reason }));
	}
}

export const subscribeTwoFactor = (nc: NatsConnection, subject: string) => {
	const subscription = nc.subscribe(subject, {
		callback: (error, message) => {
			if (error) return logErrorMsg(error, { subject });

			void handleTwoFactor(message);
		},
	});

	return subscription;
};
