import type { Context } from "elysia";

export const PROVIDER_NAMES = ["fake", "sbp", "heleket"] as const;
export type PaymentProviderName = typeof PROVIDER_NAMES[number];
export type PaymentStatus = "pending" | "succeeded" | "failed" | "expired" | "refunded";

/** Minor units per currency; RUB in kopecks, stablecoins with six decimals. */
export const CURRENCY_EXPONENT: Record<string, number> = {
	RUB: 2,
	USDT: 6,
	USDC: 6,
};

export type CreateInvoiceInput = {
	orderId: string;
	/** Amount in minor units of `currency`. */
	amountMinor: number;
	currency: string;
	expiresAt: Date;
	/** Public API origin, used to build the fake checkout link. */
	origin: string;
};

export type Invoice = {
	providerPaymentId: string;
	payUrl: string | null;
	status: PaymentStatus;
};

export type WebhookEvent = {
	eventId: string;
	orderId: string;
	providerPaymentId: string;
	status: PaymentStatus;
	amountMinor?: number;
	currency?: string;
};

export interface PaymentProvider {
	name: PaymentProviderName;
	currencies: string[];
	/** A provider without credentials is hidden from the invoice route. */
	isConfigured(): boolean;
	createInvoice(input: CreateInvoiceInput): Promise<Invoice>;
	verifyWebhook(ctx: Context): Promise<WebhookEvent | null>;
}

/** Decodes a minor-unit amount into the currency's major units for rates. */
export function fromMinor(amountMinor: number, currency: string): number {
	const exponent = CURRENCY_EXPONENT[currency] ?? 2;
	return amountMinor / 10 ** exponent;
}
