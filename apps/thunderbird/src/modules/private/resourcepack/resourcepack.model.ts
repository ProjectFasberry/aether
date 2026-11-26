import { t } from "elysia";

export const resourcePackSchema = t.Object({
	id: t.Number(),
	sha1: t.String(),
	sha256: t.String(),
	size: t.Number(),
	url: t.String(),
	stable_url: t.String(),
	minecraft: t.Array(t.String()),
	pack_format: t.Nullable(t.Number()),
	notes: t.Nullable(t.String()),
	uploaded_by: t.Nullable(t.String()),
	created_at: t.String(),
	is_current: t.Boolean(),
});

export const resourcePackListSchema = t.Object({
	current: t.Nullable(resourcePackSchema),
	items: t.Array(resourcePackSchema),
});

export const resourcePackUploadResponseSchema = t.Object({
	pack: resourcePackSchema,
	warnings: t.Array(t.String()),
});
