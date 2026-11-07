import type { TransactionalTask } from "../config/saga";
import { callBroadcast } from "../server/call-broadcast";
import { callServerCommand } from "../server/call-command";
import { DONATE_TITLE } from "@repo/shared/constants/donate-aliases";
import { publishUpdateGroup } from "#/lib/publishers/pub-update-group";
import {
	type DeliveryEffect,
	resolveDeliveryEffect,
} from "#/modules/store/order/internal/delivery-dedup";
import {
	applyDeliveryEffect,
	removeDeliveryEffect,
} from "#/modules/store/order/internal/delivery-dedup-db";

type ProcessDonate = {
  recipient: string,
  value: string,
  type: any,
  fallbackServer?: string,
  effect?: DeliveryEffect | null,
}

function defaultEffect(value: string): DeliveryEffect {
  return {
    permission: `group.${value}`,
    value: true,
    world: "global",
    server: "global",
    contexts: {},
    expiry: 0,
  };
}

async function setPlayerGroup(
  nickname: string,
  effect: DeliveryEffect | null,
  fallbackServer?: string,
): Promise<boolean> {
  if (!effect) return false;

  await applyDeliveryEffect(nickname, effect, { fallbackServer });
  publishUpdateGroup({ nickname, permission: effect.permission });

  return true;
}

/**
 * Removes the inherited group directly from LuckPerms. This mirrors the direct
 * insert used for delivery and does not depend on the NATS command executor.
 */
export async function removeDonateGroup({
  recipient,
  value,
  fallbackServer,
}: {
  recipient: string;
  value: string;
  fallbackServer?: string;
}): Promise<void> {
  const effect = defaultEffect(value);

  await removeDeliveryEffect(recipient, effect, { fallbackServer });
  publishUpdateGroup({ nickname: recipient, permission: effect.permission });
}

async function updatePlayerGroup({ recipient, value, effect, fallbackServer }: ProcessDonate) {
  const resolved = effect ?? resolveDeliveryEffect({
    recipient,
    type: "donate",
    value,
  });

  const result = await setPlayerGroup(recipient, resolved, fallbackServer);

  if (!result) {
    throw new Error("Error updating player group")
  }
}

export function processDonatePayment(
  { recipient, type, value, fallbackServer, effect }: ProcessDonate
): TransactionalTask[] {
  const message = `Игрок ${recipient} приобрел привилегию ${DONATE_TITLE[value as keyof typeof DONATE_TITLE]}`;

  const giveDonateTask: TransactionalTask = {
    name: "give-donate-group",
    execute: () => updatePlayerGroup({ recipient, type, value, effect }),
    rollback: () => {
      console.log(`Rolling back group for ${recipient}. Setting to default.`);
      return setPlayerGroup(recipient, defaultEffect("default"));
    }
  };

  const notifyTask: TransactionalTask = {
    name: "notify-player",
    execute: () => callServerCommand({
      parent: "cmi",
      value: `toast ${recipient} Поздравляем с покупкой!`,
      meta: { recipient, fallbackServer, wait: false },
    }),
  };

  const broadcastTask: TransactionalTask = {
    name: "broadcast-to-server",
    execute: () => callBroadcast(
      { message },
    ),
  };

  return [giveDonateTask, notifyTask, broadcastTask];
}
