import { DateTime } from "#/helpers/typebox";
import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import Elysia, { t } from "elysia";

const dictListPayloadSchema = t.Array(
	t.Object({
		id: t.Number(),
		value: t.String(),
		created_at: DateTime,
		key: t.String(),
	}),
);
async function getDictList() {
	const query = await general.selectFrom("dictionaries").selectAll().execute();

	return query;
}

export const dictionariesList = new Elysia().use(validatePermission(permissions.get("DICTIONARIES.READ"))).get(
	"/list",
	async (ctx) => {
		const data = await getDictList();
		return { data };
	},
	{
		response: {
			200: withData(dictListPayloadSchema),
		},
		detail: {
			summary: buildRouteSummary("List all dictionaries"),
		},
	},
);
