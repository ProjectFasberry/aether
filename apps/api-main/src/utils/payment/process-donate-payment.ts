import type { TransactionalTask } from "../config/saga";
import { callBroadcast } from "../server/call-broadcast";
import { callServerCommand } from "../server/call-command";
import { DONATE_TITLE } from "@repo/shared/constants/donate-aliases";
import { publishUpdateGroup } from "#/lib/publishers/pub-update-group";
import { luckperms } from "#/shared/database/luckperms-db";

type ProcessDonate = {
  recipient: string, 
  value: string, 
  type: any
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
        .doUpdateSet({ permission })
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

async function updatePlayerGroup({ recipient, type, value }: ProcessDonate) {
  const result = await setPlayerGroup(recipient, `group.${value}`);

  if (!result) {
    throw new Error("Error updating player group")
  }
}

export function processDonatePayment(
  { recipient, type, value }: ProcessDonate
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
    execute: () => callServerCommand(
      { parent: "cmi", value: `toast ${recipient} Поздравляем с покупкой!` },
    ),
  };

  const broadcastTask: TransactionalTask = {
    name: "broadcast-to-server",
    execute: () => callBroadcast(
      { message },
    ),
  };

  return [giveDonateTask, notifyTask, broadcastTask];
}