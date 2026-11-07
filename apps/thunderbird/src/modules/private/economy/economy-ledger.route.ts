import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { wrapError } from "@repo/shared/lib/helpers";
import { buildRouteSummary } from "#/utils";
import { decodeCursor, findPlayer, listLedger } from "./economy.model";

const querySchema = t.Object({
	nickname: t.String({ minLength: 1, maxLength: 32 }),
	limit: t.Optional(t.String({ maxLength: 3 })),
	endCursor: t.Optional(t.String({ maxLength: 512 })),
});

export const economyLedger = new Elysia()
	.use(validatePermission(permissionsService.get("ECONOMY.READ")))
	.get("/ledger", async ({ query, status }) => {
		const nickname = await findPlayer(query.nickname);
		if (!nickname) return status(404, wrapError("PLAYER_NOT_FOUND"));

		const cursor = query.endCursor ? decodeCursor(query.endCursor) : null;
		if (query.endCursor && !cursor) return status(400, wrapError("INVALID_CURSOR"));

		const limit = Math.min(Math.max(Number(query.limit ?? 50), 1), 100);
		const page = await listLedger({ nickname, cursor, limit });

		// The panel client unwraps the outer `data`; `meta` travels inside.
		return { data: page };
	}, {
		query: querySchema,
		detail: {
			summary: buildRouteSummary("Get a player ledger"),
		},
	});
