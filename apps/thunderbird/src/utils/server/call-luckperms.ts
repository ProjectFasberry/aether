import { randomUUID } from "node:crypto";
import { getEnv } from "#/shared/env";
import { natsService } from "#/shared/nats/client";
import type { DeliveryEffect } from "#/modules/store/order/internal/delivery-dedup";
import { resolveTargetServer } from "./call-command";

type LuckPermsReply = {
	result?: string;
	error?: string;
};

/**
 * Sends a structured effect to the LuckPerms bridge in nats-spigot. The bridge
 * calls the LP API, so the local cache is updated immediately and the other
 * servers receive a user-update message. The outbox retries this request.
 */
export async function callLuckPermsEffect(
	effect: DeliveryEffect,
	{
		recipient,
		uuid,
		kind,
		fallbackServer,
	}: {
		recipient: string;
		uuid?: string | null;
		kind: "grant" | "revoke";
		fallbackServer?: string;
	},
): Promise<{ result: string }> {
	const target = await resolveTargetServer(recipient, fallbackServer);
	const subject = `server.${target}.luckperms`;

	const response = await natsService.getInstance().request(
		subject,
		JSON.stringify({
			...effect,
			requestId: randomUUID(),
			recipient,
			uuid: uuid ?? null,
			kind,
			debug: getEnv().LUCKPERMS_BRIDGE_DEBUG === true,
		}),
		{ timeout: 5_000 },
	);

	const reply = response.json<LuckPermsReply>();

	if (reply.result === "ok" || reply.result === "already_has" || reply.result === "missing") {
		return { result: reply.result };
	}

	throw new Error(reply.error ?? "LUCKPERMS_BRIDGE_FAILED");
}
