import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { general } from "#/shared/database/general-db";
import { luckperms } from "#/shared/database/luckperms-db";
import { redisService } from "#/shared/redis/client";
import { getEnv } from "#/shared/env";
import { callLuckPermsEffect } from "#/utils/server/call-luckperms";
import {
	effectCovers,
	nodeCovers,
	resolveDeliveryEffect,
	type DeliveryCheck,
	type DeliveryEffect,
	type DeliveryEffectNode,
	type DeliveryProduct,
} from "./delivery-dedup";

const LOCK_PREFIX = "store:delivery-lock:";
const LOCK_TTL_MS = 15_000;
const LOCK_WAIT_MS = 3_000;
const LOCK_RETRY_MS = 50;

/**
 * Serializes duplicate checks and writes for the same recipient/permission
 * across API replicas. The lock is advisory: a failed acquisition is a
 * retryable `DELIVERY_BUSY`, never a silent double charge.
 */
export async function withDeliveryLocks<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
	const unique = [...new Set(keys)].sort();
	if (unique.length === 0) return fn();

	const redis = redisService.getInstance();
	const held = new Map<string, string>();

	try {
		for (const key of unique) {
			const lockKey = `${LOCK_PREFIX}${key}`;
			const token = randomUUID();
			const deadline = Date.now() + LOCK_WAIT_MS;

			while (true) {
				const acquired = await redis.set(lockKey, token, "PX", LOCK_TTL_MS, "NX");
				if (acquired === "OK") {
					held.set(lockKey, token);
					break;
				}

				if (Date.now() >= deadline) throw new Error("DELIVERY_BUSY");
				await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
			}
		}

		return await fn();
	} finally {
		for (const [lockKey, token] of held) {
			await redis.eval(
				"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
				1,
				lockKey,
				token,
			).catch(() => undefined);
		}
	}
}

export async function findRecipientUuid(nickname: string): Promise<string | null> {
	const lower = nickname.toLowerCase();

	const lp = await luckperms
		.selectFrom("luckperms_players")
		.select("uuid")
		.where(sql`lower(username)`, "=", lower)
		.executeTakeFirst();

	if (lp?.uuid) return String(lp.uuid).toLowerCase();

	const player = await general
		.selectFrom("players")
		.select("uuid")
		.where(sql`lower(nickname)`, "=", lower)
		.executeTakeFirst();

	return player?.uuid ? String(player.uuid).toLowerCase() : null;
}

async function ensureLuckpermsPlayer(nickname: string, uuid: string): Promise<void> {
	await luckperms
		.insertInto("luckperms_players")
		.values({
			uuid,
			username: nickname.toLowerCase(),
			primary_group: "default",
		})
		.onConflict((oc) => oc.column("uuid").doNothing())
		.execute();
}

async function findExistingNodes(uuid: string, permission: string): Promise<DeliveryEffectNode[]> {
	return await luckperms
		.selectFrom("luckperms_user_permissions")
		.select(["permission", "value", "world", "server", "contexts", "expiry"])
		.where("uuid", "=", uuid)
		.where("permission", "=", permission)
		.execute();
}

export async function checkEffectDuplicate(
	recipient: string,
	effect: DeliveryEffect,
): Promise<DeliveryCheck> {
	const uuid = await findRecipientUuid(recipient);
	if (!uuid) return { effect, duplicate: false, uuid: null };

	const existing = (await findExistingNodes(uuid, effect.permission))
		.find((node) => nodeCovers(node, effect));

	return {
		effect,
		duplicate: Boolean(existing),
		uuid,
		existing,
	};
}

/**
 * Checks every product once. The result is keyed by the product index so the
 * caller can keep the original cart/order lines and mark only duplicates.
 */
export async function checkProductsDuplicates(
	products: DeliveryProduct[],
): Promise<Map<number, DeliveryCheck>> {
	const result = new Map<number, DeliveryCheck>();
	const uuids = new Map<string, string | null>();
	const nodes = new Map<string, DeliveryEffectNode[]>();
	const priorEffects = new Map<string, DeliveryEffect[]>();

	for (let index = 0; index < products.length; index += 1) {
		const product = products[index];
		const effect = resolveDeliveryEffect(product);

		if (!effect) {
			result.set(index, { effect: null, duplicate: false });
			continue;
		}

		const recipientKey = product.recipient.toLowerCase();
		if (!uuids.has(recipientKey)) {
			uuids.set(recipientKey, await findRecipientUuid(product.recipient));
		}

		const uuid = uuids.get(recipientKey) ?? null;
		const effectKey = `${recipientKey}:${effect.permission}`;
		const effectWasInOrder = priorEffects.get(effectKey)?.some((prior) => effectCovers(prior, effect)) ?? false;

		// The same grant can appear twice in one cart. Treat the later line as
		// a duplicate instead of charging for it and refunding it at delivery.
		if (effectWasInOrder) {
			result.set(index, { effect, duplicate: true, uuid });
			continue;
		}

		priorEffects.set(effectKey, [...(priorEffects.get(effectKey) ?? []), effect]);

		if (!uuid) {
			result.set(index, { effect, duplicate: false, uuid: null });
			continue;
		}

		const nodeKey = `${uuid}:${effect.permission}`;
		if (!nodes.has(nodeKey)) {
			nodes.set(nodeKey, await findExistingNodes(uuid, effect.permission));
		}

		const existing = nodes.get(nodeKey)?.find((node) => nodeCovers(node, effect));
		result.set(index, {
			effect,
			duplicate: Boolean(existing),
			uuid,
			existing,
		});
	}

	return result;
}

/**
 * Writes the full effect (value, scope, contexts, expiry), not only the
 * permission. A missing LuckPerms player row is created from the game player
 * uuid first, so a donation bought before the first join can be delivered.
 */
export async function applyDeliveryEffect(
	nickname: string,
	effect: DeliveryEffect,
	options?: { fallbackServer?: string },
): Promise<void> {
	const uuid = await findRecipientUuid(nickname);

	if (getEnv().LUCKPERMS_BRIDGE) {
		await callLuckPermsEffect(effect, {
			recipient: nickname,
			uuid,
			kind: "grant",
			fallbackServer: options?.fallbackServer,
		});
		return;
	}

	if (!uuid) throw new Error("PLAYER_NOT_FOUND");

	await ensureLuckpermsPlayer(nickname, uuid);

	await luckperms
		.insertInto("luckperms_user_permissions")
		.values({
			uuid,
			permission: effect.permission,
			value: effect.value,
			world: effect.world,
			server: effect.server,
			contexts: JSON.stringify(effect.contexts),
			expiry: effect.expiry,
		})
		.onConflict((oc) => oc
			.columns(["uuid", "permission"])
			.doUpdateSet({
				value: effect.value,
				world: effect.world,
				server: effect.server,
				contexts: JSON.stringify(effect.contexts),
				expiry: effect.expiry,
			}))
		.execute();
}

export async function removeDeliveryEffect(
	nickname: string,
	effect: DeliveryEffect,
	options?: { fallbackServer?: string },
): Promise<void> {
	const uuid = await findRecipientUuid(nickname);

	if (getEnv().LUCKPERMS_BRIDGE) {
		await callLuckPermsEffect(effect, {
			recipient: nickname,
			uuid,
			kind: "revoke",
			fallbackServer: options?.fallbackServer,
		});
		return;
	}

	if (!uuid) return;

	await luckperms
		.deleteFrom("luckperms_user_permissions")
		.where("uuid", "=", uuid)
		.where("permission", "=", effect.permission)
		.execute();
}
