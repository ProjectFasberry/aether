import * as z from "zod";
import { currencyCryptoSchema, currencyFiatSchema } from "../entities/currencies-schema";
import type { JsonValue } from "../../types/db/general-database-types";
import { nicknameSchema } from "../auth";

export const paymentFiatMethodSchema = z.enum(["card", "sbp"]);
export const paymentTypeSchema = z.enum(["donate", "belkoin", "charism", "item", "event"]);
export const paymentCurrencySchema = z.union([currencyFiatSchema, currencyCryptoSchema]);
export const paymentStatusSchema = z.enum(["created", "received", "captured", "cancelled", "failed"]);
export const paymentValueSchema = z.union([z.number(), z.string()]);

export const paymentMetaSchema = z.object({
	nickname: z
		.string()
		.min(1, { error: "Никнейм должен содержать хотя бы 1 символ" })
		.max(32, { error: "Превышена максимальная длина никнейма" }),
	paymentType: paymentTypeSchema,
	paymentValue: paymentValueSchema,
});

export function paymentTypeValidator({ data, ctx }: { data: any; ctx: any }) {
	if (data.currency === "RUB" && !paymentFiatMethodSchema.safeParse(data.fiatMethod).success) {
		ctx.issues.push({
			input: "",
			code: "custom",
			message: `Invalid fiat method value. Needed: ${paymentFiatMethodSchema.options.join(", ")}`,
		});
	}
}

export const orderItemSchema = z.object({
	id: z.number(),
	recipient: z.string(),
});

export const orderDetailsSchema = z.object({
	method: paymentFiatMethodSchema.optional(),
});

export const createOrderSchema = orderDetailsSchema;

export const orderEventPayloadTypeSchema = z.enum(["invoice_paid", "canceled"]);

export const orderEventPayloadSchema = z.object({
	type: orderEventPayloadTypeSchema,
	payload: z.object({
		id: z.string(),
		date_at: z.union([z.string(), z.date()]),
	}),
});

export const STORE_TYPES = ["donate", "event"] as const;

export const editorFieldSchema = z
	.object({})
	.loose()
	.transform((v) => v as JsonValue);

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

export type CreateOrderTopUpSchema = z.infer<typeof createOrderTopUpSchema>;

export type OutputPayload = {
	url: string;
	orderId: string;
	invoiceId: number;
	totalPrice: number;
	uniqueId: string;
};

export type OrderInputPayload = CreateOrderTopUpSchema & {
	initiator: string;
};

export type StoreExchangeRatesPayload = Record<
	GameCurrency,
	{
		USDT: number;
		RUB: number;
		UAH: number;
		KZT: number;
	}
>;
