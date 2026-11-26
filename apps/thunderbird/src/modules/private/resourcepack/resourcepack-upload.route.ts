import Elysia, { t } from "elysia";
import * as z from "zod";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import {
	DEFAULT_PACK_VERSIONS,
	MAX_PACK_BYTES,
	MAX_PACK_MB,
	uploadResourcePack,
} from "#/modules/content/resourcepack.model";
import { publishedClientVersions } from "#/modules/content/manifest.model";
import { createAdminActivityLog } from "../private.model";
import { resourcePackUploadResponseSchema } from "./resourcepack.model";

const uploadBodySchema = z.object({
	file: z
		.file()
		.min(1)
		.max(MAX_PACK_BYTES)
		.mime([
			"application/zip",
			"application/x-zip-compressed",
			"application/octet-stream",
		]),
	/** Client versions the pack is published for; defaults to every known one. */
	minecraft: z.string().optional(),
	notes: z.string().max(500).optional(),
});

const VERSION_PATTERN = /^\d+(\.\d+)*$/;

export const resourcePackUpload = new Elysia()
	.use(validatePermission("resourcepack.publish"))
	.post(
		"/",
		async ({ body, nickname, status }) => {
			const minecraft = (body.minecraft ?? DEFAULT_PACK_VERSIONS.join(","))
				.split(",")
				.map((version) => version.trim())
				.filter(Boolean);

			if (minecraft.length === 0) return status(400, wrapError("minecraft must list at least one version"));
			if (minecraft.some((version) => !VERSION_PATTERN.test(version))) {
				return status(400, wrapError("minecraft contains an invalid version"));
			}

			// Targeting a version without published content would create a bundle
			// with the pack alone and make the catalog accept an uninstallable runtime.
			const published = await publishedClientVersions();
			const unknown = minecraft.filter((version) => !published.includes(version));
			if (unknown.length > 0) {
				return status(400, wrapError(`no client content is published for ${unknown.join(", ")}`));
			}

			try {
				const result = await uploadResourcePack({
					file: body.file,
					uploadedBy: nickname,
					minecraft,
					notes: body.notes ?? null,
				});

				return { data: result };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);

				if (message.includes("already uploaded")) return status(409, wrapError(message));
				if (
					message.includes("larger than") ||
					message.includes("not a zip") ||
					message.includes("empty") ||
					message.includes("zip64")
				) {
					return status(400, wrapError(message));
				}

				throw status(500, wrapError("RESOURCE_PACK_UPLOAD_FAILED"));
			}
		},
		{
			parse: "multipart/form-data",
			body: uploadBodySchema,
			response: {
				200: withData(resourcePackUploadResponseSchema),
				400: withError(t.String()),
				409: withError(t.String()),
				500: withError(t.String()),
			},
			afterResponse: ({ nickname: initiator, permission }) => {
				if (initiator) {
					createAdminActivityLog({
						event: permission,
						initiator,
						metadata: { resourcePack: "upload" },
					});
				}
			},
			detail: {
				summary: buildRouteSummary(`Upload a resource pack archive (max ${MAX_PACK_MB} MB)`),
			},
		},
	);
