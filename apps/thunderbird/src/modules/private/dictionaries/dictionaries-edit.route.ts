import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import Elysia, { type Static, t } from "elysia";
import { createAdminActivityLog } from "../private.model";
import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import { DateTime } from "#/helpers/typebox";

const editDictSchema = t.Object({
	key: t.UnionEnum(["title", "key"]),
	value: t.String(),
});

const editDictPayloadSchema = t.Object({
	key: t.String(),
	value: t.String(),
	created_at: DateTime,
	id: t.Number(),
});

async function editDict(id: number, { key, value }: Static<typeof editDictSchema>) {
	const query = await general
		.updateTable("dictionaries")
		.set({
			[key]: value,
		})
		.where("id", "=", id)
		.returningAll()
		.executeTakeFirstOrThrow();

	return query;
}

export const dictionariesEdit = new Elysia()
  .use(validatePermission(permissionsService.get("DICTIONARIES.UPDATE")))
  .post("/:id/edit", async ({ params: { id }, body }) => {
    const data = await editDict(id, body);
    return { data };
  }, {
    body: editDictSchema,
    params: t.Object({
      id: t.Number(),
    }),
    afterResponse: ({ permission, nickname: initiator }) => {
      createAdminActivityLog({ initiator, event: permission });
    },
    response: {
      200: withData(editDictPayloadSchema),
    },
    detail: {
      summary: buildRouteSummary("Edit a dictionary entry"),
    },
  });
