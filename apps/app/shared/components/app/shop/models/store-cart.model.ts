import { action, atom, batch, createCtx, Ctx } from "@reatom/core";
import {
	reatomAsync,
	sleep,
	withAssign,
	withCache,
	withConcurrency,
	withDataAtom,
	withInit,
	withStatusesAtom,
} from "@reatom/framework";
import { Payment } from "./store.model";
import { withSsr } from "@/shared/lib/ssr";
import { PageContextServer } from "vike/types";
import { logError } from "@/shared/lib/log";
import { mergeSnapshot } from "@/shared/lib/snapshot";
import { CartFinalPrice } from "@repo/shared/types/entities/store";
import type { CartItem, CartPayload, OrderSingleDefault } from "@repo/shared/types/entities/store";
import { client, withAbort, withJsonBody, withLogging, withQueryParams } from "@/shared/lib/client-wrapper";
import { isEmptyArray } from "@/shared/lib/array";
import { isAuthedAtom } from "@/shared/models/page-context.model";
import { getRecipient } from "./store-recipient.model";
import { simulate } from "./store-item-status.model";
import { cartDataAtom } from "./store-cart.model.atoms";
import { navigate } from "vike/client/router";
import { PaymentStatus } from "@repo/shared/types/db/payments-database-types";
import { withSearchParamsPersist } from "@reatom/url";

export async function getCartData(init?: RequestInit) {
	return client<CartPayload>("store/cart/list", init).pipe(withAbort(init?.signal)).exec();
}

export const cartDataSelectedAtom = atom<CartItem[]>((ctx) => ctx.spy(cartDataAtom).filter((t) => t.selected)).pipe(
	withInit((ctx) => ctx.get(cartDataAtom).filter((t) => t.selected)),
);

export const cartDataItemIsSelectAtom = (id: number) =>
	atom((ctx) => {
		const data = ctx.spy(cartDataSelectedAtom).find((d) => d.id === id);

		return data?.selected ?? false;
	}, `${id}.selectedStatus`);

export const cartPriceAtom = atom<CartFinalPrice>({ BELKOIN: 0, CHARISM: 0 }, "cartPrice").pipe(withSsr("cartPrice"));

export const cartDataSelectedItemsLengthAtom = atom(
	(ctx) => ctx.spy(cartDataSelectedAtom).length,
	"cartDataSelectedItemsLength",
);

export const cartWarningDialogIsOpenAtom = atom(false, "cartWarningDialogIsOpen");
export const cartWarningDialogDataAtom = atom<{ title: string; description: string } | null>(
	null,
	"cartWarningDialogData",
);

export const cartIsValidAtom = atom((ctx) => {
	const productsLengthValidate = ctx.spy(cartDataSelectedItemsLengthAtom) >= 1;
	const productsRecipientValidate = ctx.spy(cartDataSelectedAtom).filter((target) => target.recipient).length >= 1;

	return productsLengthValidate && productsRecipientValidate;
}, "cartIsValidAtom");

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

export async function getOrders(params: Record<string, string>, init: RequestInit) {
	return client<Orders[]>("store/order/list", { ...init, throwHttpErrors: false })
		.pipe(withQueryParams(params))
		.exec();
}

export const storeOrdersStatusAtom = atom<"all" | "succeeded" | "pending">("all", "storeOrdersStatus").pipe(
	withSearchParamsPersist("status", (d = "all") => d),
);

export const storeOrdersTypeAtom = atom<"default" | "game" | "all">("all", "storeOrdersType").pipe(
	withSearchParamsPersist("type", (d = "all") => d),
);

storeOrdersStatusAtom.onChange((ctx) => {
	storeOrdersListAction.cacheAtom.reset(ctx);
	storeOrdersListAction(ctx);
});
storeOrdersTypeAtom.onChange((ctx) => {
	storeOrdersListAction.cacheAtom.reset(ctx);
	storeOrdersListAction(ctx);
});

export const storeOrdersListAction = reatomAsync(
	async (ctx) => {
		const params = {
			type: ctx.get(storeOrdersTypeAtom),
			status: ctx.get(storeOrdersStatusAtom),
		};

		return await ctx.schedule(() => getOrders(params, { signal: ctx.controller.signal }));
	},
	{
		name: "storeOrdersListAction",
		onReject: (_, e) => {
			logError(e);
		},
	},
).pipe(
	withDataAtom(null, (_, data) => (isEmptyArray(data) ? null : data)),
	withStatusesAtom(),
	withCache({ swr: false }),
);

export const storeCartFilterAtom = atom<"pending" | "succeeded" | "all">("all", "storeCartFilter");

export const storeCartFilteresOrdersAtom = atom((ctx) => {
	const filter = ctx.spy(storeCartFilterAtom);

	let data: Orders[] = [];

	if (filter === "succeeded") {
		const orders = ctx.spy(storeOrdersListAction.dataAtom);
		data = orders ? orders.filter((target) => target.status === "succeeded") : [];
	}

	if (filter === "pending") {
		const orders = ctx.spy(storeOrdersListAction.dataAtom);

		data = orders ? orders.filter((target) => target.status === "pending") : [];
	}

	if (filter === "all") {
		data = ctx.spy(storeOrdersListAction.dataAtom) ?? [];
	}

	return data;
}, "storeCartFilteresOrders");

export async function defineCartData(pageContext: PageContextServer) {
	const headers = pageContext.headers;

	const ctx = createCtx();

	if (headers) {
		try {
			const data = await getCartData({ headers });

			cartPriceAtom(ctx, data.price);
			cartDataAtom(ctx, data.products);
		} catch (e) {
			console.error(e);
		}
	}

	const newSnapshot = mergeSnapshot(ctx, pageContext);

	pageContext.snapshot = newSnapshot;
}

export const addItemToCartAction = reatomAsync(
	async (ctx, id: number) => {
		const isAuth = ctx.get(isAuthedAtom);

		if (!isAuth) {
			ctx.schedule(() => navigate("/auth"));
			return;
		}

		simulate(ctx, id, "load");

		const recipient = getRecipient(ctx);

		try {
			await ctx.schedule(() => sleep(60));

			const result = await ctx.schedule(() =>
				client.post<boolean>("store/cart/add").pipe(withJsonBody({ id, recipient }), withLogging()).exec(),
			);

			return { id, result };
		} catch (e) {
			simulate(ctx, id, "unload");
			throw e;
		}
	},
	{
		name: "addItemToCartAction",
		onFulfill: (ctx, res) => {
			if (!res) return;

			const { result, id } = res;

			if (!id) {
				console.warn("Store target id is not defined");
				throw new Error("Store target id is not defined");
			}

			batch(ctx, () => {
				simulate(ctx, id, "select");
				simulate(ctx, id, "unload");
			});

			cartTrigger.touch(ctx);

			updateCart(ctx);
		},
		onReject: (ctx, e) => {
			logError(e, { type: "combined" });
		},
	},
).pipe(withStatusesAtom());

export async function updateCart(ctx: Ctx) {
	const data = await getCartData();

	batch(ctx, () => {
		cartDataAtom(ctx, data.products);
		cartPriceAtom(ctx, data.price);
	});
}

export const cartIsTriggeredAtom = atom(false, "cartIsTriggered");

export const cartTrigger = atom(null, "cartTrigger").pipe(
	withAssign((ctx, name) => ({
		touch: action(async (ctx) => {
			cartIsTriggeredAtom(ctx, true);
			await ctx.schedule(() => sleep(300));
			cartIsTriggeredAtom(ctx, false);
		}).pipe(withConcurrency()),
	})),
);

cartIsTriggeredAtom.onChange((ctx, state) => console.log("cartIsTriggeredAtom", state));
