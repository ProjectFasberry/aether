import { defineUser } from "#/lib/define";
import Elysia, { t } from "elysia";

type SessionPayload = {
  id: string;
  browser: string;
  geo: { city: string; country: string };
  createdAt: string;
};

export const session = new Elysia()
  .use(defineUser())
  .group("/session", (app) => app
    .get("/list", async ({ nickname, ...ctx }) => {
      const data: { data: SessionPayload[]; meta: PaginatedMeta } = {
        data: [],
        meta: { 
          hasNextPage: false, 
          hasPrevPage: false,
          endCursor: undefined, 
          startCursor: undefined 
        },
      };

      return {
        data,
      };
    })
    .get("/current", async ({ nickname, ...ctx }) => {
      const data: SessionPayload = {
        id: "test",
        createdAt: new Date().toISOString(),
        browser: "Google Chrome",
        geo: { city: "Volgograd", country: "Russia" },
      };

      return {
        data,
      };
    })
    .delete("/all", async ({ ...ctx }) => {

    })
    .delete("/:id", async ({ params: { id } }, ...ctx) => {

    }, {
      params: t.Object({
        id: t.String({ minLength: 6 })
      })
    })
  );