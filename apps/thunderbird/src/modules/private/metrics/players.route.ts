import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import {
	DEFAULT_RANGE_MS,
	MAX_RANGE_MS,
	getKnownServers,
	getPlayersOnline,
	getPlayersSeries,
	getPlayersTotals,
} from "./players.model";
import { peakOnline } from "./players.math";

const playersQuerySchema = t.Object({
	from: t.Optional(t.String({ format: "date-time" })),
	to: t.Optional(t.String({ format: "date-time" })),
	server: t.Optional(t.String()),
});

const pointSchema = t.Object({
	at: t.String(),
	joins: t.Number(),
	quits: t.Number(),
	unique: t.Number(),
});

const playersPayloadSchema = t.Object({
	online: t.Object({
		total: t.Number(),
		byServer: t.Array(t.Object({ server: t.Union([t.String(), t.Null()]), online: t.Number() })),
	}),
	servers: t.Array(t.String()),
	series: t.Array(pointSchema),
	totals: t.Object({ joins: t.Number(), quits: t.Number(), unique: t.Number(), peakOnline: t.Number() }),
	range: t.Object({ from: t.String(), to: t.String(), server: t.Union([t.String(), t.Null()]) }),
});

export const playersMetrics = new Elysia()
	.use(validatePermission("metrics.read", { withExternal: true }))
	.get("/players", async ({ query }) => {
		const to = query.to ? new Date(query.to) : new Date();
		const from = query.from
			? new Date(query.from)
			: new Date(to.getTime() - DEFAULT_RANGE_MS);

		const clampedFrom = new Date(Math.max(from.getTime(), to.getTime() - MAX_RANGE_MS));
		const server = query.server?.trim() || null;
		const range = { from: clampedFrom, to, server };

		const [series, totals, online, servers] = await Promise.all([
			getPlayersSeries(range),
			getPlayersTotals(range),
			getPlayersOnline(),
			getKnownServers(),
		]);

		const visibleOnline = server
			? online.filter((entry) => entry.server === server)
			: online;

		return {
			data: {
				online: {
					total: visibleOnline.reduce((sum, entry) => sum + entry.online, 0),
					byServer: visibleOnline,
				},
				servers,
				series,
				totals: { ...totals, peakOnline: peakOnline(series) },
				range: {
					from: clampedFrom.toISOString(),
					to: to.toISOString(),
					server,
				},
			},
		};
	}, {
		query: playersQuerySchema,
		response: {
			200: withData(playersPayloadSchema),
			500: withError(),
		},
		detail: {
			summary: buildRouteSummary("Get player presence metrics"),
		},
	});
