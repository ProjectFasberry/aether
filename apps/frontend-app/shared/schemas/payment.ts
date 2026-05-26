import * as z from "zod";
import { nicknameSchema } from "./auth";
import { editorFieldSchema } from "./news";

export const orderEventPayloadTypeSchema = z.enum(["invoice_paid", "canceled"]);

export const orderEventPayloadSchema = z.object({
	type: orderEventPayloadTypeSchema,
	payload: z.object({
		id: z.string(),
		date_at: z.union([z.string(), z.date()]),
	}),
});

export const currencyCryptoSchema = z.enum(["USDT", "TON", "BTC", "ETH", "LTC", "BNB", "TRX", "USDC"]);
export const currencyFiatSchema = z.enum(["RUB"]);

export const STORE_TYPES = ["donate", "event"] as const;

export const storeItemSchema = z.object({
	id: z.number(),
	title: z.string(),
	description: z.string().nullable(),
	imageUrl: z.string(),
	type: z.union([z.enum(STORE_TYPES), z.string()]),
	command: z.string().nullable(),
	value: z.string(),
	currency: z.string(),
	price: z.number(),
	content: editorFieldSchema,
});

export const paymentFiatMethodSchema = z.enum(["card", "sbp"]);
export const paymentTypeSchema = z.enum(["donate", "belkoin", "charism", "item", "event"]);
export const paymentCurrencySchema = z.union([currencyFiatSchema, currencyCryptoSchema]);
export const paymentStatusSchema = z.enum(["created", "received", "captured", "cancelled", "failed"]);
export const paymentValueSchema = z.union([z.number(), z.string()]);

export type PaymentCryptoCurrency = z.infer<typeof currencyCryptoSchema>;
export type PaymentDonateType = string;
export type PaymentCurrency = z.infer<typeof paymentCurrencySchema>;
export type PaymentResponseStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentType = z.infer<typeof paymentTypeSchema>;
export type PaymentValueType = z.infer<typeof paymentValueSchema>;

export type PaymentMeta = {
	nickname: string;
	paymentType: PaymentType;
	paymentValue: PaymentDonateType | string | number;
};

export type CreateOrderRoutePayload = {
	purchase: {
		uniqueId: string;
	};
	payload: {
		price: {
			BELKOIN: number;
			CHARISM: number;
		};
	};
};

export type OrderEventPayload = z.infer<typeof orderEventPayloadSchema>;

export const GAME_CURRENCIES = ["CHARISM", "BELKOIN"] as const;
export type GameCurrency = (typeof GAME_CURRENCIES)[number];

export const methodTypes = z.enum(["heleket", "sbp", "cryptobot"]);
export type MethodType = z.infer<typeof methodTypes>;

export const createOrderTopUpSchema = z.object({
	target: z.enum(GAME_CURRENCIES),
	value: z.number().min(1).max(1000000),
	method: z.object({
		type: methodTypes,
		currency: paymentCurrencySchema,
	}),
	recipient: nicknameSchema,
	comment: z
		.string()
		.min(1)
		.transform((t) => t.trim() || null)
		.optional(),
});
