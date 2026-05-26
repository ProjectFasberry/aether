import * as z from "zod";
import { editorFieldSchema, type JsonValue } from "./news";
import { GAME_CURRENCIES, storeItemSchema } from "./payment";

const fields = storeItemSchema.pick({
	title: true,
	description: true,
	imageUrl: true,
	type: true,
	command: true,
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
			value: z.union([z.number(), z.string(), z.stringbool(), editorFieldSchema]),
		})
		.superRefine(({ field, value }, ctx) => {
			const validator = fields.shape[field];
			const result = validator.safeParse(value);

			console.log(result);

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
	title: z.string(),
	price: z.string(),
	type: z.string(),
	value: z.string(),
	currency: z.enum(GAME_CURRENCIES),
	imageUrl: z.string().optional().nullable(),
	command: z.string().nullable(),
	content: z
		.object({})
		.loose()
		.transform((v) => v as JsonValue),
});
