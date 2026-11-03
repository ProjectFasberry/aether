import * as z from "zod";
import type { JsonValue } from "@gen/db/general";

export const paymentFiatMethodSchema = z.enum(["card", "sbp"]);
export const paymentTypeSchema = z.enum(["donate", "belkoin", "charism", "item", "event"]);
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
