import { general } from "#/shared/database/general-db";
import { belkoinFor } from "#/modules/economy/rates.model";
import { credit, debit } from "#/modules/economy/wallet.model";
import { getEnv } from "#/shared/env";
import type { DB } from "@gen/db/general";
import type { Kysely } from "kysely";
import { nanoid } from "nanoid";
import { sql } from "kysely";
import { getProvider } from "./providers";
import { registerGrantHandler } from "#/modules/economy/grant-jobs.model";
import { fromMinor, type PaymentProviderName, type PaymentStatus } from "./types";

const db = general as unknown as Kysely<DB & { orders: any; payment_events: any }>;

const DEFAULT_TTL_MINUTES = 15;

export type OrderRow = {
	id: number;
	order_id: string;
	nickname: string;
	provider: string;
	status: PaymentStatus;
	amount_minor: number;
	currency: string;
	belkoin: number;
	rate: number | null;
	spread: number | null;
	provider_payment_id: string | null;
	pay_url: string | null;
	metadata: unknown;
	created_at: Date;
	expires_at: Date;
	paid_at: Date | null;
	refunded_at: Date | null;
};

export type OrderView = {
	orderId: string;
	provider: string;
	status: PaymentStatus;
	amountMinor: number;
	currency: string;
	belkoin: number;
	payUrl: string | null;
	expiresAt: Date;
};

export class PaymentError extends Error {
	constructor(public code: string) {
		super(code);
	}
}

function view(row: OrderRow): OrderView {
	return {
		orderId: row.order_id,
		provider: row.provider,
		status: row.status,
		amountMinor: Number(row.amount_minor),
		currency: row.currency,
		belkoin: Number(row.belkoin),
		payUrl: row.pay_url,
		expiresAt: row.expires_at,
	};
}

function ttlMinutes(): number {
	return getEnv().PAYMENT_INVOICE_TTL_MINUTES ?? DEFAULT_TTL_MINUTES;
}

export async function createPaymentInvoice({
	nickname,
	providerName,
	amountMinor,
	currency,
	origin,
}: {
	nickname: string;
	providerName: PaymentProviderName;
	amountMinor: number;
	currency: string;
	origin: string;
}): Promise<OrderView> {
	const provider = getProvider(providerName);
	if (!provider || !provider.isConfigured()) throw new PaymentError("PROVIDER_NOT_CONFIGURED");
	if (!provider.currencies.includes(currency)) throw new PaymentError("CURRENCY_NOT_SUPPORTED");

	const major = fromMinor(amountMinor, currency);
	const priced = await belkoinFor(major, currency);

	if (!priced) throw new PaymentError("RATE_NOT_FOUND");
	if (priced.amount < 1) throw new PaymentError("AMOUNT_TOO_SMALL");

	const orderId = nanoid(12);
	const expiresAt = new Date(Date.now() + ttlMinutes() * 60 * 1000);

	const [order] = await db
		.insertInto("orders")
		.values({
			order_id: orderId,
			nickname,
			provider: providerName,
			amount_minor: amountMinor,
			currency,
			belkoin: priced.amount,
			rate: priced.conversion.rate,
			spread: priced.conversion.spread,
			expires_at: expiresAt,
		})
		.returningAll()
		.execute() as unknown as OrderRow[];

	let invoice;

	try {
		invoice = await provider.createInvoice({ orderId, amountMinor, currency, expiresAt, origin });
	} catch (error) {
		await db
			.updateTable("orders")
			.set({ status: "failed", metadata: { error: error instanceof Error ? error.message : String(error) } })
			.where("order_id", "=", orderId)
			.execute();

		throw new PaymentError("PROVIDER_ERROR");
	}

	await db
		.updateTable("orders")
		.set({ provider_payment_id: invoice.providerPaymentId, pay_url: invoice.payUrl })
		.where("order_id", "=", orderId)
		.execute();

	return view({ ...order, provider_payment_id: invoice.providerPaymentId, pay_url: invoice.payUrl });
}

export async function getOrder(orderId: string): Promise<OrderRow | null> {
	const row = await db
		.selectFrom("orders")
		.selectAll()
		.where("order_id", "=", orderId)
		.executeTakeFirst() as unknown as OrderRow | undefined;

	return row ?? null;
}

export async function listOrders(nickname: string, limit = 50): Promise<OrderView[]> {
	const rows = await db
		.selectFrom("orders")
		.selectAll()
		.where("nickname", "=", nickname)
		.orderBy("created_at", "desc")
		.limit(limit)
		.execute() as unknown as OrderRow[];

	return rows.map(view);
}

/**
 * Applies a provider event. Only a pending order changes; a repeated event (or
 * a late one after a refund) returns the stored state instead of moving money.
 */
export async function settleOrder({
	provider,
	orderId,
	providerPaymentId,
	status,
	amountMinor,
	currency,
}: {
	provider: PaymentProviderName;
	orderId: string;
	providerPaymentId: string;
	status: PaymentStatus;
	amountMinor?: number;
	currency?: string;
}): Promise<OrderView | null> {
	const order = await getOrder(orderId);
	if (!order || order.provider !== provider) return null;

	if (order.status !== "pending") return view(order);

	if (status === "succeeded") {
		if (
			typeof amountMinor === "number"
			&& amountMinor < Number(order.amount_minor)
			&& (!currency || currency === order.currency)
		) {
			// Underpayment: never credit a partial invoice as if it were paid.
			await db
				.updateTable("orders")
				.set({
					status: "failed",
					provider_payment_id: providerPaymentId,
					metadata: { ...(order.metadata as object ?? {}), underpaidMinor: amountMinor },
				})
				.where("order_id", "=", orderId)
				.execute();

			return view({ ...order, status: "failed" });
		}

		await credit(order.nickname, "BELKOIN", Number(order.belkoin), {
			reason: "payment:BELKOIN",
			orderId,
			actor: "system",
			metadata: { provider, providerPaymentId, amountMinor, currency },
		});
	}

	await db
		.updateTable("orders")
		.set({
			status,
			provider_payment_id: providerPaymentId,
			paid_at: status === "succeeded" ? new Date() : null,
		})
		.where("order_id", "=", orderId)
		.execute();

	return view({ ...order, status, provider_payment_id: providerPaymentId });
}

/** Reverses a paid invoice. Throws when the player already spent the coins. */
export async function refundPayment({
	orderId,
	actor,
	adminReason,
}: {
	orderId: string;
	actor: string;
	adminReason: string;
}): Promise<OrderView | null> {
	const order = await getOrder(orderId);
	if (!order || order.status !== "succeeded") return null;

	await debit(order.nickname, "BELKOIN", Number(order.belkoin), {
		reason: "payment.refund:BELKOIN",
		orderId,
		actor,
		metadata: { adminReason },
	});

	await db
		.updateTable("orders")
		.set({ status: "refunded", refunded_at: new Date() })
		.where("order_id", "=", orderId)
		.execute();

	return view({ ...order, status: "refunded" });
}

export const ORDER_LIST_SORTS = ["date", "amount"] as const;
export type OrderListSort = typeof ORDER_LIST_SORTS[number];
export type OrderListCursor = { sort: OrderListSort; value: string | number; id: number };

export function encodeOrderCursor(cursor: OrderListCursor): string {
	return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeOrderCursor(value: string): OrderListCursor | null {
	try {
		const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<OrderListCursor> & { created_at?: string };

		// Cursors issued before sorting was added carried `created_at`.
		if (!parsed.sort && typeof parsed.created_at === "string") {
			parsed.sort = "date";
			parsed.value = parsed.created_at;
		}

		if (parsed.sort !== "date" && parsed.sort !== "amount") return null;
		if (typeof parsed.id !== "number" || !Number.isInteger(parsed.id)) return null;
		if (parsed.sort === "date" && (typeof parsed.value !== "string" || Number.isNaN(Date.parse(parsed.value)))) return null;
		if (parsed.sort === "amount" && typeof parsed.value !== "number") return null;

		return parsed as OrderListCursor;
	} catch {
		return null;
	}
}

/** Admin order feed with keyset pagination. */
export async function listAllOrders({
	status,
	nickname,
	sort = "date",
	order = "desc",
	cursor,
	limit = 50,
}: {
	status?: string;
	nickname?: string;
	sort?: OrderListSort;
	order?: "asc" | "desc";
	cursor?: OrderListCursor | null;
	limit?: number;
}): Promise<{ data: Record<string, unknown>[]; meta: { hasNextPage: boolean; endCursor?: string } }> {
	const direction = order === "asc" ? "asc" : "desc";
	const sortColumn = sort === "amount" ? "belkoin" : "created_at";

	let query = db
		.selectFrom("orders")
		.selectAll()
		.orderBy(sortColumn, direction)
		.orderBy("id", direction)
		.limit(limit + 1);

	if (status) query = query.where("status", "=", status);
	if (nickname) query = query.where("nickname", "=", nickname);

	if (cursor) {
		const comparator = direction === "asc" ? ">" : "<";
		const value = sort === "date" ? new Date(cursor.value as string) : cursor.value;

		query = query.where(
			sql<boolean>`(
				${sql.ref(sortColumn)} ${sql.raw(comparator)} ${value}
				or (${sql.ref(sortColumn)} = ${value} and "id" ${sql.raw(comparator)} ${cursor.id})
			)`,
		);
	}

	const rows = await query.execute() as unknown as (OrderRow & { id: number })[];
	const hasNextPage = rows.length > limit;
	if (hasNextPage) rows.pop();

	const last = rows[rows.length - 1];

	return {
		data: rows.map((row) => ({
			id: Number(row.id),
			orderId: row.order_id,
			nickname: row.nickname,
			provider: row.provider,
			status: row.status,
			amountMinor: Number(row.amount_minor),
			currency: row.currency,
			belkoin: Number(row.belkoin),
			createdAt: row.created_at,
			expiresAt: row.expires_at,
			paidAt: row.paid_at,
			refundedAt: row.refunded_at,
		})),
		meta: {
			hasNextPage,
			endCursor: last
				? encodeOrderCursor({
					sort,
					value: sort === "date" ? new Date(last.created_at).toISOString() : Number(last.belkoin),
					id: Number(last.id),
				})
				: undefined,
		},
	};
}

registerGrantHandler("payment.settle", async (payload) => {
	const order = await settleOrder({
		provider: payload.provider as PaymentProviderName,
		orderId: String(payload.orderId),
		providerPaymentId: String(payload.providerPaymentId),
		status: payload.status as PaymentStatus,
		amountMinor: typeof payload.amountMinor === "number" ? payload.amountMinor : undefined,
		currency: typeof payload.currency === "string" ? payload.currency : undefined,
	});

	if (!order) throw new Error("ORDER_NOT_FOUND");
});

/** Pending invoices past their TTL are closed; a late callback is ignored. */
export async function expireOrders(): Promise<number> {
	const result = await db
		.updateTable("orders")
		.set({ status: "expired" })
		.where("status", "=", "pending")
		.where("expires_at", "<", new Date())
		.executeTakeFirst();

	return Number(result.numUpdatedRows ?? 0);
}

export async function recordPaymentEvent({
	provider,
	eventId,
	orderId,
	signatureValid,
	payload,
	error,
}: {
	provider: string;
	eventId?: string;
	orderId?: string;
	signatureValid: boolean;
	payload: unknown;
	error?: string;
}): Promise<void> {
	await db
		.insertInto("payment_events")
		.values({
			provider,
			provider_event_id: eventId ?? null,
			order_id: orderId ?? null,
			signature_valid: signatureValid,
			payload: payload ?? {},
			error: error ?? null,
			processed_at: error ? null : new Date(),
		})
		.onConflict((oc) => oc.columns(["provider", "provider_event_id"]).doNothing())
		.execute();
}
