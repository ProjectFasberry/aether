import type { NatsConnection, Subscription } from "@nats-io/nats-core";
import { safeJsonParse } from "@repo/shared/utils";
import { appLogger } from "#/shared/constants/logger";
import { skinsService } from "#/shared/services/skins";

type SkinsChangedPayload = {
	uuid?: string;
	nickname?: string;
	skinName?: string;
};

/**
 * The game server publishes after SkinsRestorer stores a selection. Dropping
 * the cache is enough: the next read rebuilds it and renders the head.
 */
export const subscribeSkinsChanged = (nc: NatsConnection, subject: string): Subscription => {
	return nc.subscribe(subject, {
		callback: (error, message) => {
			if (error) {
				appLogger.warn({ message: "Skins changed event failed", error });
				return;
			}

			const parsed = safeJsonParse<SkinsChangedPayload>(message.string());

			if (!parsed.ok || !parsed.value.nickname) return;

			void skinsService.skin.invalidate(parsed.value.nickname).catch((e) => {
				appLogger.warn({
					message: "Skins cache invalidation failed",
					nickname: parsed.value.nickname,
					error: e,
				});
			});
		},
	});
};
