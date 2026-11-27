import * as z from "zod";
import {
	editorFieldSchema,
	GAME_CURRENCIES,
	nullableStoreCommandSchema,
	storeItemSchema,
	storePriceStringSchema,
} from "./payment";
import type { JsonValue } from "@gen/db/general";

const fields = storeItemSchema.pick({
	title: true,
	description: true,
	imageUrl: true,
	type: true,
	command: true,
	refund_cmd: true,
	value: true,
	currency: true,
	price: true,
	content: true,
});

export const EDITABLE_FIELDS = Object.keys(fields.shape) as (keyof typeof fields.shape)[];

export const storeItemEditSchema = z.array(
	z
		.object({
			field: z.enum(EDITABLE_FIELDS),
			value: z.union([z.number(), z.string(), z.stringbool(), z.null(), editorFieldSchema]),
		})
		.superRefine(({ field, value }, ctx) => {
			const validator = fields.shape[field];
			const result = validator.safeParse(value);

			if (!result.success) {
				const issue = result.error.issues[0];

				if (issue) {
					ctx.addIssue({
						path: ["value"],
						code: "custom",
						message: issue.message,
					});
				}
			}
		}),
);

export const storeItemCreateSchema = z.object({
	title: z.string().trim().min(1),
	description: z.string().nullable(),
	price: storePriceStringSchema,
	type: z.string(),
	value: z.string().trim().min(1),
	currency: z.enum(GAME_CURRENCIES),
	imageUrl: z.string().optional().nullable(),
	command: nullableStoreCommandSchema,
	refund_cmd: nullableStoreCommandSchema.optional(),
	content: z
		.object({})
		.loose()
		.transform((v) => v as JsonValue),
});
