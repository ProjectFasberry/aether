import { DateTime } from "#/helpers/typebox";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import Elysia, { t } from "elysia";

const historySchema = t.Array(
	t.Object({
		id: t.Number(),
		created_at: DateTime,
		event: t.String(),
		initiator: t.String(),
	}),
);

async function getHistoryList() {
	const query = await general.selectFrom("admin_activity_log").selectAll().orderBy("created_at", "desc").execute();

	return query;
}

export const historyList = new Elysia().use(validatePermission(permissions.get("HISTORY.READ"))).get(
	"/list",
	async () => {
		const data = await getHistoryList();
		return { data };
	},
	{
		response: {
			200: withData(historySchema),
		},
		detail: {
			summary: buildRouteSummary("Get history list"),
		},
	},
);
