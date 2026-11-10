import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { migrateBalances } from "#/modules/economy/wallet.model";
import { buildRouteSummary } from "#/lib/routes";
import { createAdminActivityLog } from "../private.model";

const bodySchema = t.Optional(t.Object({
	cursor: t.Optional(t.String({ maxLength: 32 })),
	limit: t.Optional(t.Integer({ minimum: 1, maximum: 500 })),
}));

export const economyMigrate = new Elysia()
	.use(validatePermission("economy.write"))
	.post("/migrate", async ({ body, nickname: initiator }) => {
		const batch = await migrateBalances({
			cursor: body?.cursor ?? "",
			limit: body?.limit ?? 100,
		});

		void createAdminActivityLog({
			event: "economy.migration",
			initiator,
			metadata: { ...batch },
		});

		return { data: batch };
	}, {
		body: bodySchema,
		detail: {
			summary: buildRouteSummary("Migrate plugin balances into wallets"),
		},
	});
