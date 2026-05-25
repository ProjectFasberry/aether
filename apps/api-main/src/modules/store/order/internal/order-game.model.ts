import { general } from "#/shared/database/general-db";
import { executeSaga, type TransactionalTask } from "#/utils/config/saga";
import { processDonatePayment } from "#/utils/payment/process-donate-payment";
import { callServerCommand } from "#/utils/server/call-command";
import { GAME_CURRENCIES } from "@repo/shared/schemas/payment";

type TaskItem = {
  type: string;
  value: string;
  recipient: string;
};

function createTasksForItem({ recipient, type, value }: TaskItem): TransactionalTask[] {
  const tasks: TransactionalTask[] = [];

  if (type === "donate") {
    tasks.push(...processDonatePayment({ recipient, type: "donate", value }));
  }

  if (type === "event") {
    tasks.push({
      name: "notify-player",
      execute: () => callServerCommand({ parent: "cmi", value: `toast ${recipient} Поздравляем с покупкой!` }),
    });
  }

  return tasks;
}

export const initialPrices: Record<string, number> = Object
  .fromEntries(GAME_CURRENCIES.map((currency) => [currency, 0]));

type Product = {
  recipient: string;
  id: number;
  price: string;
  type: string;
  value: string;
  currency: string;
  title: string;
};

export async function createGamePaymentRecord(uniqueId: string, initiator: string, products: Product[]) {
  const ids: number[] = [];

  const query = await general.transaction().execute(async (trx) => {
    for (const { recipient, id: store_item_id } of products) {
      const { id } = await trx
        .insertInto("payments_game_childs")
        .values({ recipient, store_item_id, order_id: uniqueId })
        .returningAll()
        .executeTakeFirstOrThrow();

      ids.push(id);
    }

    const payloadOrderItemIds = ids.map((item_id) => ({
      unique_id: uniqueId,
      initiator,
    }));

    await trx
      .insertInto("payments_game")
      .values(payloadOrderItemIds)
      .executeTakeFirstOrThrow();
  });

  return query;
}

export async function updateGamePaymentRecord(uniqueId: string) {
  return general
    .updateTable("payments_game")
    .set({ finished_at: new Date().toISOString() })
    .where("unique_id", "=", uniqueId)
    .executeTakeFirstOrThrow();
}

export async function processStoreGamePurchase(
  initiator: string,
  finishPrice: typeof initialPrices,
  products: Product[],
) {
  async function execute() {
    const globalTasks: TransactionalTask[] = [];

    const { BELKOIN, CHARISM } = finishPrice;

    if (BELKOIN > 0) {
      const takeBelkoinTask: TransactionalTask = {
        name: "take-belkoin",
        execute: (signal) => callServerCommand({ parent: "p", value: `take ${initiator} ${BELKOIN}` }),
        rollback: (signal) => callServerCommand({ parent: "p", value: `give ${initiator} ${BELKOIN}` }),
      };

      globalTasks.push(takeBelkoinTask);
    }

    if (CHARISM > 0) {
      const takeCharismTask: TransactionalTask = {
        name: "take-charism",
        execute: (signal) => callServerCommand({ parent: "cmi", value: `money take ${initiator} ${CHARISM}` }),
        rollback: (signal) => callServerCommand({ parent: "cmi", value: `money give ${initiator} ${CHARISM} ` }),
      };

      globalTasks.push(takeCharismTask);
    }

    products.forEach((product) => {
      const productTasks = createTasksForItem(product);
      globalTasks.push(...productTasks);
    });

    const results = await executeSaga(globalTasks);
    return results;
  }

  const result = await execute();

  if (result.status === "error") {
    const error = `${result.error instanceof Error ? result.error.message : "Unknown error"}`;
    return { data: null, error };
  }

  return { result };
}