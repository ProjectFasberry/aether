
import { general } from "#/shared/database/general-db";
import { type Static, t } from "elysia";

export const updateOptionsSchema = t.Object({
  value: t.Boolean()
})

export async function updateOptions(name: string, { value }: Static<typeof updateOptionsSchema>): Promise<Static<typeof updateOptionsSchema>> {
  const query = await general
    .updateTable("options")
    .set({ name, value })
    .where("name", "=", name)
    .returning("value")
    .executeTakeFirstOrThrow()

  return query;
}

export async function getOptions() {
  const query = await general
    .selectFrom("options")
    .select([
      "name",
      "value",
      "title"
    ])
    .execute();

  return query
}
