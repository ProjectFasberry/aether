import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { getRefundable, getWallet } from "#/modules/economy/wallet.model";
import { wrapError } from "@repo/shared/lib/helpers";
import { buildRouteSummary } from "#/utils";
import { findPlayer } from "./economy.model";

const querySchema = t.Object({
	nickname: t.String({ minLength: 1, maxLength: 32 }),
});

export const economyWallet = new Elysia()
	.use(validatePermission(permissionsService.get("ECONOMY.READ")))
	.get("/wallet", async ({ query, status }) => {
		const nickname = await findPlayer(query.nickname);
		if (!nickname) return status(404, wrapError("PLAYER_NOT_FOUND"));

		const [wallet, refundableBelkoin, refundableCharism] = await Promise.all([
			getWallet(nickname),
			getRefundable(nickname, "BELKOIN"),
			getRefundable(nickname, "CHARISM"),
		]);

		return {
			data: {
				nickname,
				...wallet,
				refundable: {
					BELKOIN: refundableBelkoin,
					CHARISM: refundableCharism,
				},
			},
		};
	}, {
		query: querySchema,
		detail: {
			summary: buildRouteSummary("Get a player wallet"),
		},
	});
