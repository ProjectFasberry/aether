import { general } from "#/shared/database/general-db";
import { logErrorMsg } from "#/utils/config/log-utils";
import { processDonatePayment } from "#/utils/payment/process-donate-payment";
import { callServerCommand } from "#/utils/server/call-command";
import { GAME_CURRENCIES, type GameCurrency } from "@repo/shared/schemas/store/payment";
import {
	debit,
	economyTransaction,
	flushProjections,
	type ApplyResult,
	type EconomyTrx,
} from "#/modules/economy/wallet.model";
import { enqueueGrantJob, registerGrantHandler } from "#/modules/economy/grant-jobs.model";

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

/** Outbox kind for the non-money part of an order (groups, toasts, items). */
const FULFILLMENT_KIND = "store.fulfillment";

function createTasksForItem({ recipient, type, value }: Pick<Product, "recipient" | "type" | "value">) {
	const tasks: Array<() => Promise<unknown>> = [];

	if (type === "donate") {
		tasks.push(...processDonatePayment({ recipient, type: "donate", value }).map((task) => () => task.execute(new AbortController().signal)));
	}

	if (type === "event") {
		tasks.push(() => callServerCommand({ parent: "cmi", value: `toast ${recipient} Поздравляем с покупкой!` }));
	}

	return tasks;
}

async function fulfill(products: Pick<Product, "recipient" | "type" | "value">[]): Promise<void> {
	for (const product of products) {
		for (const task of createTasksForItem(product)) {
			await task();
		}
	}
}

async function createGamePaymentRecord(
	trx: EconomyTrx,
	uniqueId: string,
	initiator: string,
	products: Product[],
) {
	await trx
		.insertInto("payments_game_childs")
		.values(products.map(({ recipient, id: store_item_id }) => ({
			recipient,
			store_item_id,
			order_id: uniqueId,
		})))
		.execute();

	await trx
		.insertInto("payments_game")
		.values({ unique_id: uniqueId, initiator })
		.execute();
}

export async function updateGamePaymentRecord(uniqueId: string) {
	return general
		.updateTable("payments_game")
		.set({ finished_at: new Date().toISOString() })
		.where("unique_id", "=", uniqueId)
		.executeTakeFirstOrThrow();
}

registerGrantHandler(FULFILLMENT_KIND, async (payload) => {
	const { uniqueId, items } = payload as {
		uniqueId: string;
		items: Pick<Product, "recipient" | "type" | "value">[];
	};

	await fulfill(items);
	await updateGamePaymentRecord(uniqueId);
});

/**
 * Takes the money and writes the order in one transaction, then runs the
 * non-money effects. The money never depends on a server command: the plugins
 * read the projection of the wallet, which is retried through `grant_jobs`.
 */
export async function processStoreGamePurchase({
	initiator,
	uniqueId,
	products,
	finishPrice,
}: {
	initiator: string;
	uniqueId: string;
	products: Product[];
	finishPrice: Record<GameCurrency, number>;
}): Promise<{ error: string | null }> {
	let applied: ApplyResult[];

	try {
		applied = await economyTransaction().execute(async (trx) => {
			await createGamePaymentRecord(trx, uniqueId, initiator, products);

			const results: ApplyResult[] = [];

			for (const currency of GAME_CURRENCIES) {
				const amount = Number(finishPrice[currency] ?? 0);
				if (amount <= 0) continue;

				results.push(await debit(initiator, currency, amount, {
					reason: `store.purchase:${currency}`,
					orderId: uniqueId,
				}, trx));
			}

			return results;
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";

		if (message === "INSUFFICIENT_FUNDS") {
			return { error: "insufficient" };
		}

		logErrorMsg(error, { subject: "store-purchase" });
		return { error: message };
	}

	await flushProjections(applied);

	try {
		await fulfill(products);
		await updateGamePaymentRecord(uniqueId);
	} catch (error) {
		// The player has paid; retry the delivery instead of rolling the money
		// back. The outbox keeps the payload serializable.
		logErrorMsg(error, { subject: "store-fulfillment" });

		await enqueueGrantJob({
			orderId: uniqueId,
			kind: FULFILLMENT_KIND,
			payload: {
				uniqueId,
				items: products.map(({ recipient, type, value }) => ({ recipient, type, value })),
			},
		});
	}

	return { error: null };
}
