import type { TransactionalTask } from "../config/saga";
import { callBroadcast } from "../server/call-broadcast";
import { callServerCommand } from "../server/call-command";
import { DONATE_TITLE } from "@repo/shared/constants/donate-aliases";
import { publishUpdateGroup } from "#/lib/publishers/pub-update-group";
import { luckperms } from "#/shared/database/luckperms-db";

type ProcessDonate = {
  recipient: string,
  value: string,
  type: any,
  fallbackServer?: string,
}

async function setPlayerGroup(
  nickname: string,
  permission: string
): Promise<boolean> {
  try {
    let isUpdated = false;

    const result = await luckperms
      .insertInto("luckperms_user_permissions")
      .values((eb) => ({
        uuid: eb
          .selectFrom("luckperms_players")
          .select("uuid")
          .where("username", "=", nickname)
          .limit(1),
        permission,
        world: "global",
        expiry: 0,
        contexts: "{}",
        server: "global",
        value: true
      }))
      .onConflict((oc) => oc
        .columns(["uuid", "permission"])
        .doUpdateSet({ permission, value: true })
      )
      .executeTakeFirst();

    if (result.numInsertedOrUpdatedRows) {
      isUpdated = true;
    }

    if (isUpdated) {
      publishUpdateGroup({ nickname, permission })
    }

    return isUpdated;
  } catch (e) {
    throw e
  }
}

/**
 * Removes the inherited group directly from LuckPerms. This mirrors the direct
 * insert used for delivery and does not depend on the NATS command executor.
 */
export async function removeDonateGroup({
  recipient,
  value,
}: {
  recipient: string;
  value: string;
}): Promise<void> {
  const permission = `group.${value}`;

  await luckperms
    .deleteFrom("luckperms_user_permissions")
    .where("uuid", "=", (eb) => eb
      .selectFrom("luckperms_players")
      .select("uuid")
      .where("username", "=", recipient)
      .limit(1)
    )
    .where("permission", "=", permission)
    .execute();

  publishUpdateGroup({ nickname: recipient, permission });
}

async function updatePlayerGroup({ recipient, type, value }: ProcessDonate) {
  const result = await setPlayerGroup(recipient, `group.${value}`);

  if (!result) {
    throw new Error("Error updating player group")
  }
}

export function processDonatePayment(
  { recipient, type, value, fallbackServer }: ProcessDonate
): TransactionalTask[] {
  const message = `Игрок ${recipient} приобрел привилегию ${DONATE_TITLE[value as keyof typeof DONATE_TITLE]}`;

  const giveDonateTask: TransactionalTask = {
    name: "give-donate-group",
    execute: () => updatePlayerGroup({ recipient, type, value }),
    rollback: () => {
      console.log(`Rolling back group for ${recipient}. Setting to default.`);
      return setPlayerGroup(recipient, `group.default`);
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