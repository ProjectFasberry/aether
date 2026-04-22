import { action, atom, batch, createCtx } from "@reatom/core";
import {
	reatomAsync, sleep,
	withAssign, withCache, withConcurrency, withDataAtom, withInit, withStatusesAtom,
} from "@reatom/framework";
import { PageContextServer } from "vike/types";
import { logError } from "@/shared/lib/log";
import { mergeSnapshot } from "@/shared/lib/snapshot";
import { CartFinalPrice } from "@repo/shared/types/entities/store";
import type { CartItem, CartPayload, OrderSingleDefault } from "@repo/shared/types/entities/store";
import { client, withJsonBody, withQueryParams } from "@/shared/lib/client-wrapper";
import { isEmptyArray } from "@/shared/lib/utils";
import { isAuthedAtom } from "@/shared/models/page-context.model";
import { getRecipient } from "./store-recipient.model";
import { navigate } from "vike/client/router";
import { PaymentStatus } from "@repo/shared/types/db/payments-database-types";
import { withSearchParamsPersist } from "@reatom/url";
import { withSsr } from "@/shared/lib/reatom-helpers";
import { invariant } from "@/shared/lib/invariant";
import { storeItem } from "./store-item.model";
import { storeItems } from "./store.model";

export async function getCartData(init?: RequestInit) {
	return client<CartPayload>("store/cart/list", { ...init }).exec();
}

export const cartDataSelectedAtom = atom<CartItem[]>((ctx) =>
	ctx.spy(cartState.data).filter((t) => t.selected)
).pipe(
	withInit((ctx) => ctx.get(cartState.data).filter((t) => t.selected)),
);

export const cartDataItemIsSelectAtom = (id: number) => atom((ctx) => {
	const data = ctx.spy(cartDataSelectedAtom).find((d) => d.id === id);
	return data?.selected ?? false;
}, `${id}.selectedStatus`);

export const cartDataSelectedItemsLengthAtom = atom((ctx) => ctx.spy(cartDataSelectedAtom).length);

export const cartIsValidAtom = atom((ctx) => {
	const productsLengthValidate = ctx.spy(cartDataSelectedItemsLengthAtom) >= 1;
	const productsRecipientValidate = ctx.spy(cartDataSelectedAtom).filter((target) => target.recipient).length >= 1;
	return productsLengthValidate && productsRecipientValidate;
});

export type Orders =
	| {
		type: "game";
		created_at: Date;
		initiator: string;
		unique_id: string;
		finished_at: Date | null;
		status: "succeeded";
	}
	| {
		type: "default";
		unique_id: string;
		asset: string;
		created_at: Date;
		initiator: string;
		invoice_id: number;
		order_id: string;
		pay_url: string;
		payload: string;
		price: string;
		status: PaymentStatus;
	}
	| (OrderSingleDefault & {
		type: "default";
	});

export type StoreOrdersStateStatus = "all" | "succeeded" | "pending"
export type StoreOrdersStateType = "default" | "game" | "all"

export type OrdersFilterOption = { title: string; value: string };

const STATUS_OPTIONS = [
	{ title: "Все", value: "all" },
	{ title: "В ожидании", value: "pending" },
	{ title: "Завершенные", value: "succeeded" },
];

const TYPE_OPTIONS = [
	{ title: "Все", value: "all" },
	{ title: "Игровые", value: "game" },
	{ title: "Пополнение", value: "default" },
];

export const storeOrdersState = atom(null, "storeOrdersState").pipe(
	withAssign((_, name) => ({
		status: atom<StoreOrdersStateStatus>("all", `${name}.status`).pipe(
			withSearchParamsPersist("status", (d = "all") => d),
		),
		type: atom<StoreOrdersStateType>("all", `${name}.type`).pipe(
			withSearchParamsPersist("type", (d = "all") => d),
		),
		STATUS_OPTIONS,
		TYPE_OPTIONS
	}))
)

storeOrdersState.status.onChange((ctx) => storeOrders.refetchAll(ctx));
storeOrdersState.type.onChange((ctx) => storeOrders.refetchAll(ctx));

export const storeOrders = atom(null, "storeOrders").pipe(
	withAssign((_, name) => ({
		refetchAll: action((ctx) => {
			storeOrders.fetch.cacheAtom.reset(ctx);
			storeOrders.fetch(ctx);
		}),
		fetch: reatomAsync(async (ctx) => {
			const params = {
				type: ctx.get(storeOrdersState.type),
				status: ctx.get(storeOrdersState.status),
			};

			return await ctx.schedule(() =>
				client
					.get<Orders[]>("store/order/list", {
						signal: ctx.controller.signal,
						throwHttpErrors: false,
					})
					.pipe(
						withQueryParams(params)
					)
					.exec()
			);
		}, {
			name: `${name}.fetch`,
			onReject: (_, e) => logError(e)
		}).pipe(
			withDataAtom(null, (_, data) => (isEmptyArray(data) ? null : data)),
			withStatusesAtom(),
			withCache({ swr: false }),
		)
	}))
)

export const storeCartFilterAtom = atom<"pending" | "succeeded" | "all">("all", "storeCartFilter");

export const storeCartFilteresOrdersAtom = atom((ctx) => {
	const filter = ctx.spy(storeCartFilterAtom);

	let data: Orders[] = [];

	if (filter === "succeeded") {
		const orders = ctx.spy(storeOrders.fetch.dataAtom);
		data = orders ? orders.filter((target) => target.status === "succeeded") : [];
	}

	if (filter === "pending") {
		const orders = ctx.spy(storeOrders.fetch.dataAtom);
		data = orders ? orders.filter((target) => target.status === "pending") : [];
	}

	if (filter === "all") {
		data = ctx.spy(storeOrders.fetch.dataAtom) ?? [];
	}

	return data;
}, "storeCartFilteresOrders");

export const cartState = atom(null, "cartState").pipe(
	withAssign((_, name) => ({
		isTriggered: atom(false),
		price: atom<CartFinalPrice>({ BELKOIN: 0, CHARISM: 0 }, `${name}.price`).pipe(withSsr(`${name}.price`)),
		data: atom<CartPayload["products"]>([], `${name}.data`).pipe(withSsr(`${name}.data`))
	}))
)

export const cart = atom(null, "cart").pipe(
	withAssign((_, name) => ({
		async init(pageCtx: PageContextServer) {
			const ctx = createCtx();

			if (pageCtx.headers) {
				try {
					const data = await getCartData({ headers: pageCtx.headers });

					cartState.price(ctx, data.price);
					cartState.data(ctx, data.products);
				} catch (e) {
					console.error(e);
				}
			}

			const newSnapshot = mergeSnapshot(ctx, pageCtx);
			pageCtx.snapshot = newSnapshot;
		},
		addItem: reatomAsync(async (ctx, id: number) => {
			const isAuth = ctx.get(isAuthedAtom);

			if (!isAuth) {
				ctx.schedule(() => navigate("/auth"));
				return;
			}

			storeItems.simulate(ctx, id, "load");

			const recipient = getRecipient(ctx);

			try {
				const result = await client
					.post<boolean>("store/cart/add")
					.pipe(
						withJsonBody({ id, recipient })
					)
					.exec()

				return { id, result };
			} catch (e) {
				storeItems.simulate(ctx, id, "unload");
				throw e;
			}
		}, {
			name: `${name}.addItem`,
			onFulfill: (ctx, res) => {
				if (!res) return;

				const { result, id } = res;
				invariant(id, "Store target id is not defined")

				batch(ctx, () => {
					storeItems.simulate(ctx, id, "select");
					storeItems.simulate(ctx, id, "unload");
				});

				cart.touch(ctx);
				cart.update(ctx);
			},
			onReject: (ctx, e) => logError(e, { type: "combined" })
		}).pipe(
			withStatusesAtom()
		),
		removeItem: reatomAsync(async (ctx, id: number) => {
			storeItems.simulate(ctx, id, "load")

			try {
				const result = await client
					.delete<boolean>("store/cart/remove")
					.pipe(
						withJsonBody({ id })
					)
					.exec()

				return { id, result }
			} catch (e) {
				storeItems.simulate(ctx, id, "unload");
				throw e
			}
		}, {
			name: "removeItemFromCartAction",
			onFulfill: (ctx, { id, result }) => {
				invariant(id, "Store target id is not defined")

				batch(ctx, () => {
					storeItems.simulate(ctx, id, "select")
					storeItems.simulate(ctx, id, "unload");
				})

				batch(ctx, () => {
					cart.update(ctx)
					storeItem.updateStatus(ctx, id, { remove: true })
				});
			},
			onReject: (ctx, e) => logError(e, { type: "combined" })
		}).pipe(
			withStatusesAtom()
		),
		update: reatomAsync(async (ctx) => {
			const data = await getCartData({ signal: ctx.controller.signal });

			batch(ctx, () => {
				cartState.data(ctx, data.products);
				cartState.price(ctx, data.price);
			});
		}, `${name}.update`),
		touch: action(async (ctx) => {
			cartState.isTriggered(ctx, true);
			await ctx.schedule(() => sleep(300));
			cartState.isTriggered(ctx, false);
		}).pipe(
			withConcurrency()
		)
	}))
)