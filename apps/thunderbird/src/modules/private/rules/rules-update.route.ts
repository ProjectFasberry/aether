import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { general } from "#/shared/database/general-db";
import { createAdminActivityLog } from "../private.model";
import { ruleSchema } from "#/modules/rules/rules.model";

export const rulesUpdate = new Elysia()
  .use(validatePermission("rules.update"))
  .put("/:id", async ({ params: { id }, body, status }) => {
    const existing = await general
      .selectFrom("rules")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!existing) return status(404, wrapError("RULE_NOT_FOUND"));

    if (body.category && body.category !== existing.category) {
      const taken = await general
        .selectFrom("rules")
        .select("id")
        .where("category", "=", body.category)
        .executeTakeFirst();

      if (taken) return status(409, wrapError("RULE_CATEGORY_TAKEN"));
    }

    const updated = await general
      .updateTable("rules")
      .set({
        ...(body.category ? { category: body.category } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        updated_at: new Date(),
      })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return { data: updated };
  }, {
    params: t.Object({ id: t.Number() }),
    body: t.Object({
      category: t.Optional(t.String({ minLength: 1, maxLength: 64 })),
      content: t.Optional(t.Any()),
    }),
    response: {
      200: withData(ruleSchema),
      404: withError(t.String()),
      409: withError(t.String()),
    },
    afterResponse: ({ nickname: initiator, permission, params }) => {
      if (initiator) {
        createAdminActivityLog({
          event: permission,
          initiator,
          metadata: { ruleId: params.id },
        });
      }
    },
    detail: {
      summary: buildRouteSummary("Update a project rules category"),
    },
  });
