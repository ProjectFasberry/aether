import { general } from "#/shared/database/general-db";
import { withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";
import Elysia, { t } from "elysia";

type GroupPayload = Record<string, {
  title: string;
  nodes: { title: string; value: string }[];
}>;

const wikiCategories = new Elysia()
  .get("/categories", async () => {
    const categories = await general
      .selectFrom("wiki")
      .innerJoin("wiki_groups", "wiki_groups.id", "wiki.group_id")
      .select([
        "wiki.category as value",
        "wiki.category_title as title",
        "wiki_groups.name as group_name",
        "wiki_groups.title as group_title"
      ])
      .orderBy("created_at", "asc")
      .execute()

    const payload: GroupPayload = categories.reduce((acc, part) => {
      const { group_name, group_title, ...rest } = part;

      acc[group_name] = {
        title: group_title,
        nodes: [...acc[group_name]?.nodes ?? [], rest]
      };

      return acc;
    }, {} as GroupPayload);

    const main: GroupPayload = Object.fromEntries(
      Object.entries(payload).filter(([k]) => k !== 'general' && k !== 'main')
    )

    const mainNode = {
      title: "Все аспекты",
      nodes: Object.entries(main).map(([key, group]) => ({
        title: group.title,
        value: key
      }))
    };

    const data = {
      general: payload.general,
      main: mainNode,
      ...main
    };

    console.log({categories, payload, main});

    return { data }
  }, {
    response: {
      200: withData(
        t.Record(
          t.String(),
          t.Object({
            title: t.String(),
            nodes: t.Array(
              t.Object({
                title: t.String(),
                value: t.String(),
              })
            )
          })
        )
      )
    },
    detail: {
      summary: buildRouteSummary("Get wiki categories")
    },
  })

const wikiCategory = new Elysia()
  .get("/category/:name", async ({ params: { name: category } }) => {
    const data = await general
      .selectFrom("wiki")
      .select(["id", "category", "content", "category_title as title", "updated_at"])
      .where("category", "=", category)
      .executeTakeFirst()

    if (!data) {
      return { data: null }
    }

    return { data }
  }, {
    params: t.Object({
      name: t.String({ minLength: 1 })
    }),
    response: {
      200: withData(
        t.Nullable(
          t.Object({
            category: t.String(),
            content: t.Any(),
            id: t.Number(),
            updated_at: t.Nullable(t.Date()),
            title: t.String()
          })
        )
      )
    },
    detail: {
      summary: buildRouteSummary("Get wiki category")
    },
  })

export const wiki = new Elysia()
  .group("/wiki", app => app
    .use(wikiCategories)
    .use(wikiCategory)
  )
