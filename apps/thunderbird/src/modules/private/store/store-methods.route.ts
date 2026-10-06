import Elysia, { type Static, t } from "elysia";
import { general } from "#/shared/database/general-db";
import { getStaticUrl } from "#/helpers/volume";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { createAdminActivityLog } from "../private.model";
import { createStringBoolSchema, withData } from "#/shared/schemas";
import { buildRouteSummary } from "#/utils";

export type PrivatedMethodsPayload = Static<typeof storeMethodsPayloadSchema>;

const storeMethodsPayloadSchema = t.Array(
	t.Object({
		id: t.Number(),
		description: t.Nullable(t.String()),
		imageUrl: t.String(),
		isAvailable: t.Boolean(),
		title: t.String(),
		value: t.String(),
	}),
);

async function getMethods(): Promise<PrivatedMethodsPayload> {
	const query = await general.selectFrom("payment_methods").selectAll().execute();

	return query.map((method) => ({
		...method,
		imageUrl: getStaticUrl(method.imageUrl),
	}));
}

export const storeMethodsList = new Elysia()
  .use(validatePermission(permissionsService.get("STORE.METHODS.READ")))
  .get("/list", async () => {
    const data = await getMethods();
    return { data };
  }, {
    response: {
      200: withData(storeMethodsPayloadSchema),
    },
    detail: {
      summary: buildRouteSummary("Get store methods"),
    },
  });

const updateStoreMethodSchema = t.Object({
	key: t.UnionEnum(["isAvailable", "title", "imageUrl", "value"]),
	value: createStringBoolSchema(),
});

async function updateStoreMethod(method: string, { key, value }: Static<typeof updateStoreMethodSchema>) {
	const query = await general
		.updateTable("payment_methods")
		.set({ [key]: value })
		// when value === origin name of method
		.where("value", "=", method)
		.returning([key])
		.executeTakeFirstOrThrow();

  return query;
}

export const storeMethodsEdit = new Elysia()
  .use(validatePermission(permissionsService.get("STORE.METHODS.UPDATE")))
  .post("/edit/:method", async ({ params: { method }, body }) => {
    const data = await updateStoreMethod(method, body);
    return { data };
  }, {
    body: updateStoreMethodSchema,
    afterResponse: ({ nickname: initiator, permission }) => {
      createAdminActivityLog({ initiator, event: permission });
    },
    response: {
      200: withData(
        t.Partial(
          t.Object({
            imageUrl: t.String(),
            isAvailable: t.Boolean(),
            title: t.String(),
            value: t.String(),
          }),
        ),
      ),
    },
    detail: {
      summary: buildRouteSummary("Edit store method"),
    },
  });
