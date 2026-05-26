import * as z from "zod";

export type Json = JsonValue;

export type JsonArray = JsonValue[];

export type JsonObject = {
	[x: string]: JsonValue | undefined;
};

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonArray | JsonObject | JsonPrimitive;

export const editorFieldSchema = z
	.object({})
	.loose()
	.transform((v) => v as JsonValue);

const DEFAULT_IMAGE = `news/art-bzzvanet.webp`;

export const createNewsSchema = z.object({
	title: z.string().min(1),
	description: z.string().min(1),
	imageUrl: z
		.string()
		.trim()
		.nullable()
		.optional()
		.transform((v) => v?.trim() || DEFAULT_IMAGE),
	content: editorFieldSchema,
});

export const newsSchema = z.object({
	title: z.string(),
	description: z.string(),
	content: editorFieldSchema,
	imageUrl: z.string().nullable(),
	created_at: z.date(),
});

const fields = newsSchema.pick({
	title: true,
	description: true,
	content: true,
	imageUrl: true,
});

const EDITABLE_FIELDS = Object.keys(fields.shape) as (keyof typeof fields.shape)[];

export const newsUpdateSchema = z.array(
	z.object({
		field: z.enum(EDITABLE_FIELDS),
		value: z.union([z.string(), editorFieldSchema]),
	}),
);
