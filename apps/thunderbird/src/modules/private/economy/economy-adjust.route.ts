import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { CURRENCIES } from "#/modules/economy/wallet.model";
import { wrapError } from "@repo/shared/lib/helpers";
import { buildRouteSummary } from "#/lib/routes";
import { adjustBalance, findPlayer } from "./economy.model";
import { createAdminActivityLog } from "../private.model";

const bodySchema = t.Object({
	nickname: t.String({ minLength: 1, maxLength: 32 }),
	currency: t.UnionEnum(CURRENCIES),
	operation: t.UnionEnum(["credit", "debit"]),
	amount: t.Integer({ minimum: 1, maximum: 1_000_000_000 }),
	reason: t.String({ minLength: 3, maxLength: 200 }),
	idempotencyKey: t.String({ minLength: 8, maxLength: 64, pattern: "^[A-Za-z0-9_-]+$" }),
});

export const economyAdjust = new Elysia()
	.use(validatePermission("economy.write"))
	.post("/adjust", async ({ body, nickname: actor, status }) => {
		const nickname = await findPlayer(body.nickname);
		if (!nickname) return status(404, wrapError("PLAYER_NOT_FOUND"));

		try {
			const result = await adjustBalance({
				nickname,
				currency: body.currency,
				amount: body.amount,
				operation: body.operation,
				adminReason: body.reason,
				actor,
				idempotencyKey: body.idempotencyKey,
			});

			return {
				data: {
					nickname,
					currency: body.currency,
					balance: result.balance,
					duplicate: result.duplicate,
				},
			};
		} catch (error) {
			if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
				return status(400, wrapError("INSUFFICIENT_FUNDS"));
			}

			throw error;
		}
	}, {
		body: bodySchema,
		afterResponse: ({ permission, nickname: initiator, body }) => {
			void createAdminActivityLog({
				event: permission,
				initiator,
				severity: "warning",
				metadata: {
					nickname: body.nickname,
					currency: body.currency,
					operation: body.operation,
					amount: body.amount,
					adminReason: body.reason,
				},
			});
		},
		detail: {
			summary: buildRouteSummary("Adjust a player balance"),
		},
	});
