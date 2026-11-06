import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { wrapError } from "@repo/shared/lib/helpers";
import { buildRouteSummary } from "#/utils";
import {
	faucetSinkReport,
	grantJobsReport,
	paymentsReport,
	reconcileBalances,
	whaleReport,
} from "#/modules/economy/reconciliation.model";

const reportQuery = t.Object({
	from: t.Optional(t.String({ maxLength: 64 })),
	to: t.Optional(t.String({ maxLength: 64 })),
});

function parsePeriod(from?: string, to?: string): { from: Date; to: Date } | null {
	const end = to ? new Date(to) : new Date();
	const start = from ? new Date(from) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;

	return { from: start, to: end };
}

export const economyReport = new Elysia()
	.use(validatePermission(permissionsService.get("ECONOMY.READ")))
	.get("/reconciliation", async () => {
		const [balances, jobs] = await Promise.all([
			reconcileBalances(),
			grantJobsReport(),
		]);

		return { data: { balances, jobs } };
	}, {
		detail: {
			summary: buildRouteSummary("Reconcile wallets with plugin balances"),
		},
	})
	.get("/report", async ({ query, status }) => {
		const period = parsePeriod(query.from, query.to);
		if (!period) return status(400, wrapError("INVALID_PERIOD"));

		const [flows, payments, whales] = await Promise.all([
			faucetSinkReport(period),
			paymentsReport(period),
			whaleReport(),
		]);

		return { data: { period, flows, payments, whales } };
	}, {
		query: reportQuery,
		detail: {
			summary: buildRouteSummary("Economy faucet, sink and payments report"),
		},
	});
