import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { general } from "#/shared/database/general-db";
import Elysia, { type Static, t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import { DateTime } from "#/helpers/typebox";

const createDictSchema = t.Object({
	key: t.UnionEnum(["title", "key"]),
	value: t.String(),
});

const createDictPayloadSchema = t.Object({
	value: t.String(),
	created_at: DateTime,
	id: t.Number(),
	key: t.String(),
});

async function createDisc({
	key,
	value,
}: Static<typeof createDictSchema>): Promise<Static<typeof createDictPayloadSchema>> {
	const query = await general
		.insertInto("dictionaries")
		.values({
			key,
			value,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	return query;
}

export const dictionariesCreate = new Elysia().use(validatePermission(permissions.get("DICTIONARIES.CREATE"))).post(
	"/create",
	async ({ body }) => {
		const data = await createDisc(body);
		return { data };
	},
	{
		body: createDictSchema,
		afterResponse: ({ permission, nickname: initiator }) => {
			createAdminActivityLog({ initiator, event: permission });
		},
		response: {
			200: withData(createDictPayloadSchema),
		},
		detail: {
			summary: buildRouteSummary("Create a dictionary entry"),
		},
	},
);
