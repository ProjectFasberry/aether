import Elysia, { t } from "elysia";
import { store } from "./modules/store";
import { auth } from "./modules/auth";
import { serverGroup } from "./modules/server";
import { shared } from "./modules/shared";
import { rate } from "./modules/user/like.route";
import { me } from "#/modules/user/me.route";
import { service } from "./modules/root/service";
import { force } from "./modules/root";
import { appGroup } from "./modules/root/app";
import { validateGroup } from "./modules/root/validate";
import { processPlayerVote } from "./modules/server/votes/process-vote.route";
import { withData, withError } from "./shared/schemas";
import { wrapError } from "./helpers/wrap-error";
import { checkDatabasesHealth } from "./shared/database/init";
import { privated } from "./modules/private";

export const main = new Elysia()
	.use(shared)
	.use(auth)
	.use(me)
	.use(serverGroup)
	.use(store)
	.use(rate);

export const root = new Elysia()
	.get("/", ({ redirect }) => redirect(`/openapi`))
	.group("/health", app => app
		.get("/", () => ({ data: { status: "OK", uptime: process.uptime() } }), {
			response: {
				200: withData(
					t.Object({
						status: t.Literal("OK"),
						uptime: t.Number()
					})
				)
			}
		})
		.get("/ready", async ({ status }) => {
			try {
				const databases = await checkDatabasesHealth();

				const result = {
					status: "OK",
					timestamp: new Date().toISOString(),
					services: {
						database: databases
					}
				}

				return { data: result }
			} catch (e) {
				return status(503, wrapError("DB connection failed"))
			}
		}, {
			response: {
				200: withData(
					t.Object({
						status: t.Literal("OK"),
						timestamp: t.String(),
						services: t.Record(t.String(), t.Any())
					})
				),
				503: withError()
			}
		})
	)
	.use(privated)
	.use(appGroup)
	.use(validateGroup)
	.use(service)
	.use(force)
	.group("/third-party", app => app
		.use(processPlayerVote)
	)