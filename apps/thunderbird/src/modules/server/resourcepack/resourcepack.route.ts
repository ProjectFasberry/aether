import Elysia, { t } from "elysia";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { getPackMeta } from "#/modules/content/resourcepack.model";

/**
 * What the game backend needs to send the pack to players without the official
 * launcher: an immutable URL plus the SHA-1 clients verify.
 */
const metaSchema = t.Object({
	version: t.Number(),
	sha1: t.String(),
	sha256: t.String(),
	size: t.Number(),
	url: t.String(),
	stable_url: t.String(),
	minecraft: t.Array(t.String()),
	pack_format: t.Nullable(t.Number()),
	updated_at: t.String(),
});

export const resourcePackMeta = new Elysia()
	.get(
		"/meta",
		async ({ status }) => {
			const meta = await getPackMeta();
			if (!meta) return status(404, wrapError("RESOURCE_PACK_NOT_PUBLISHED"));

			return { data: meta };
		},
		{
			response: {
				200: withData(metaSchema),
				404: withError(t.String()),
			},
			detail: {
				summary: buildRouteSummary("Get the current resource pack URL and SHA-1"),
			},
		},
	)
	.get(
		"/latest.zip",
		async ({ set, status }) => {
			const meta = await getPackMeta();
			if (!meta) return status(404, wrapError("RESOURCE_PACK_NOT_PUBLISHED"));

			// The redirect itself must not be cached: a new pack changes the target,
			// while the versioned object it points at never does.
			set.status = 302;
			set.headers["location"] = meta.url;
			set.headers["cache-control"] = "no-store";

			return "";
		},
		{
			response: {
				404: withError(t.String()),
			},
			detail: {
				summary: buildRouteSummary("Redirect to the current resource pack archive"),
			},
		},
	);
