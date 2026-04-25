import { action, atom, batch, createCtx } from "@reatom/core";
import { reatomAsync, sleep, withAssign, withConcurrency, withInit, withStatusesAtom } from "@reatom/framework";
import { PageContextServer } from "vike/types";
import { logError } from "@/shared/lib/log";
import { mergeSnapshot } from "@/shared/lib/snapshot";
import type { CartFinalPrice, CartItem, CartListPayload, } from "@repo/shared/types/entities/store";
import { client, withJsonBody } from "@/shared/lib/client-wrapper";
import { isAuthedAtom } from "@/shared/models/page-context.model";
import { getRecipient } from "./store-recipient.model";
import { navigate } from "vike/client/router";
import { withSsr } from "@/shared/lib/reatom-helpers";
import { invariant } from "@/shared/lib/invariant";
import { storeItem } from "./store-item.model";
import { storeItems } from "./store.model";

async function getCartData(init?: RequestInit) {
	return client<CartListPayload>("store/cart/list", { ...init }).exec();
}

async function getCartPrice(init?: RequestInit) {
	return client<CartFinalPrice>("store/cart/price", { ...init }).exec();
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

export const cartState = atom(null, "cartState").pipe(
	withAssign((_, name) => ({
		isTriggered: atom(false),
		price: atom<CartFinalPrice>({ BELKOIN: 0, CHARISM: 0 }, `${name}.price`).pipe(withSsr(`${name}.price`)),
		data: atom<CartListPayload["data"]>([], `${name}.data`).pipe(withSsr(`${name}.data`))
	}))
)

export const cart = atom(null, "cart").pipe(
	withAssign((_, name) => ({
		// server only
		async init(pageCtx: PageContextServer) {
			const headers = pageCtx.headers;
			if (!headers) return;

			const ctx = createCtx();

			const [list, price] = await Promise.all([
				getCartData({ headers }),
				getCartPrice({ headers })
			]);

			cartState.price(ctx, price);
			cartState.data(ctx, list.data);

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
					.post<boolean>(`store/cart/add/${id}`)
					.pipe(withJsonBody({ recipient }))
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
					.delete<boolean>(`store/cart/remove/${id}`)
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
			const [list, price] = await Promise.all([
				getCartData({ signal: ctx.controller.signal }),
				getCartPrice({ signal: ctx.controller.signal })
			]);

			cartState.data(ctx, list.data);
			cartState.price(ctx, price);
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