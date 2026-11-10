import Elysia, { t } from "elysia";
import { requireApiKey } from "../../lib/guards/bearer";
import { sendAlert } from "../../shared/notify/alert";
import { withData, withError } from "../../helpers";

const alertBodySchema = t.Object({
	from: t.String({ minLength: 1, maxLength: 64 }),
	message: t.String({ minLength: 1, maxLength: 4096 }),
	title: t.Optional(t.String({ minLength: 1, maxLength: 128 })),
	severity: t.Optional(t.UnionEnum(["info", "warning", "critical"])),
});

/**
 * Entry point for services outside this codebase (minotaur, wiki, host
 * scripts): one request fans out to Gotify and Telegram.
 */
export const alertsRoute = new Elysia()
	.use(requireApiKey())
	.post("/internal/alerts", async ({ body }) => {
		const delivered = await sendAlert(body);

		return { data: { delivered } };
	}, {
		body: alertBodySchema,
		response: {
			200: withData(t.Object({ delivered: t.Number() })),
			401: withError(),
		},
		detail: {
			summary: "Fan out an infrastructure alert",
		},
	});
