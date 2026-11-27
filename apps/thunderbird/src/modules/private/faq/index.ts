import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import { createAdminActivityLog } from "../private.model";
import {
  createFaq,
  deleteFaq,
  faqCreateSchema,
  faqItemSchema,
  faqLocaleSchema,
  faqScopeFilterSchema,
  faqUpdateSchema,
  listFaq,
  updateFaq,
} from "#/modules/faq/faq.model";

const listQuerySchema = t.Object({
  scope: t.Optional(faqScopeFilterSchema),
  locale: t.Optional(faqLocaleSchema),
});

const idParamsSchema = t.Object({ id: t.String({ minLength: 1 }) });

/** Reading and editing are separate permissions, so the routes are too. */
const faqReadRoutes = new Elysia()
  .use(validatePermission("content.read"))
  .get("/faq/list", async ({ query }) => {
    return { data: await listFaq(query.scope, query.locale) };
  }, {
    query: listQuerySchema,
    response: {
      200: withData(t.Array(faqItemSchema)),
    },
    detail: {
      summary: buildRouteSummary("List FAQ entries for the panel"),
    },
  });

const faqWriteRoutes = new Elysia()
  .use(validatePermission("content.update"))
  .post("/faq/create", async ({ body }) => {
    return { data: await createFaq(body) };
  }, {
    body: faqCreateSchema,
    response: {
      200: withData(faqItemSchema),
    },
    afterResponse: ({ permission, nickname }) => {
      createAdminActivityLog({ initiator: nickname, event: permission });
    },
    detail: {
      summary: buildRouteSummary("Create a FAQ entry"),
    },
  })
  .patch("/faq/:id", async ({ params: { id }, body, status }) => {
    const updated = await updateFaq(id, body);
    if (!updated) return status(404, wrapError("FAQ_NOT_FOUND"));

    return { data: updated };
  }, {
    params: idParamsSchema,
    body: faqUpdateSchema,
    response: {
      200: withData(faqItemSchema),
      404: withError(t.String()),
    },
    afterResponse: ({ permission, nickname, params }) => {
      createAdminActivityLog({
        event: permission,
        initiator: nickname,
        metadata: { faqId: params.id },
      });
    },
    detail: {
      summary: buildRouteSummary("Update a FAQ entry"),
    },
  })
  .delete("/faq/:id", async ({ params: { id }, status }) => {
    const deleted = await deleteFaq(id);
    if (!deleted) return status(404, wrapError("FAQ_NOT_FOUND"));

    return { data: "OK" as const };
  }, {
    params: idParamsSchema,
    response: {
      200: withData(t.Literal("OK")),
      404: withError(t.String()),
    },
    afterResponse: ({ permission, nickname, params }) => {
      createAdminActivityLog({
        event: permission,
        initiator: nickname,
        metadata: { faqId: params.id },
      });
    },
    detail: {
      summary: buildRouteSummary("Delete a FAQ entry"),
    },
  });

export const faqPrivate = new Elysia()
  .use(faqReadRoutes)
  .use(faqWriteRoutes);
