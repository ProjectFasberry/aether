import Elysia, { t } from "elysia";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { getPublishedFaq, faqItemSchema, faqScopeFilterSchema, faqLocaleSchema } from "./faq.model";

const faqQuerySchema = t.Object({
  scope: t.Optional(faqScopeFilterSchema),
  locale: t.Optional(faqLocaleSchema),
});

/**
 * Public FAQ for a page. Only published entries are returned and the answer is
 * cached briefly: edits from the panel show up within a minute.
 */
export const faq = new Elysia()
  .get("/faq", async ({ query, set }) => {
    set.headers["cache-control"] = "public, max-age=30, stale-while-revalidate=120";

    return {
      data: await getPublishedFaq(query.scope ?? "home", query.locale ?? "ru"),
    };
  }, {
    query: faqQuerySchema,
    response: {
      200: withData(t.Array(faqItemSchema)),
    },
    detail: {
      summary: buildRouteSummary("Get the public FAQ for a page"),
    },
  });
