import Elysia from "elysia";
import { validatePermission } from "#/lib/validators";
import { buildRouteSummary } from "#/lib/routes";
import { withData, withError } from "#/shared/schemas";
import { wrapError } from "@repo/shared/lib/helpers";
import {
	adminLandSchema,
	createAdminLand,
	createManualLandSchema,
	createRandomLandSchema,
	landAdminError,
} from "./lands.model";

const errorResponses = {
	400: withError(),
	404: withError(),
	409: withError(),
	500: withError(),
};

export const landsCreateRoutes = new Elysia()
	.use(validatePermission("lands.create"))
	.post("/random", async ({ body, status }) => {
		try {
			const data = await createAdminLand({
				players: body.players,
				name: body.name,
				title: body.title,
				chunks: body.chunks,
			});

			return { data };
		} catch (e) {
			const err = landAdminError.reader(e);
			return status(err.code as 400 | 404 | 409 | 500, wrapError(err.msg));
		}
	}, {
		body: createRandomLandSchema,
		response: {
			200: withData(adminLandSchema),
			...errorResponses,
		},
		detail: {
			summary: buildRouteSummary("Create a random land"),
		},
	})
	.post("/manual", async ({ body, status }) => {
		try {
			const data = await createAdminLand({
				players: body.players,
				name: body.name,
				title: body.title,
				type: body.type,
				level: body.level,
				chunks: body.chunks,
				stats: body.stats,
			});

			return { data };
		} catch (e) {
			const err = landAdminError.reader(e);
			return status(err.code as 400 | 404 | 409 | 500, wrapError(err.msg));
		}
	}, {
		body: createManualLandSchema,
		response: {
			200: withData(adminLandSchema),
			...errorResponses,
		},
		detail: {
			summary: buildRouteSummary("Create a manually configured land"),
		},
	});
