import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { wrapError } from "@repo/shared/lib/helpers";
import { buildRouteSummary } from "#/lib/routes";
import { refundOrder } from "./economy.model";
import { createAdminActivityLog } from "../private.model";

const bodySchema = t.Object({
	orderId: t.String({ minLength: 1, maxLength: 64 }),
	reason: t.String({ minLength: 3, maxLength: 200 }),
});

export const economyRefund = new Elysia()
	.use(validatePermission("economy.write"))
	.post("/refund", async ({ body, nickname: actor, status }) => {
		const refunded = await refundOrder({
			orderId: body.orderId,
			adminReason: body.reason,
			actor,
		});

		if (!refunded) return status(404, wrapError("ORDER_NOT_FOUND"));

		return { data: { orderId: body.orderId, refunded } };
	}, {
		body: bodySchema,
		afterResponse: ({ permission, nickname: initiator, body }) => {
			void createAdminActivityLog({
				event: permission,
				initiator,
				severity: "warning",
				metadata: { orderId: body.orderId, adminReason: body.reason },
			});
		},
		detail: {
			summary: buildRouteSummary("Refund a game order"),
		},
	});
