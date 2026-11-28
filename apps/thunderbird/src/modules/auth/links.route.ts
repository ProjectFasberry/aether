import Elysia, { t } from "elysia";
import { ipPlugin } from "#/lib/plugins/index";
import { buildRouteSummary } from "#/lib/routes";
import { withData, withError } from "#/shared/schemas";
import { isProduction } from "#/shared/env";
import { allowRequest } from "#/shared/services/rate-limit";
import { wrapError } from "@repo/shared/lib/helpers";
import { acceptInvite, acceptReferral, checkLink, linkError } from "./player-links.model";

const errorStatus = (code: number) => code as 400 | 404 | 409 | 410 | 500;

const linkCheck = new Elysia()
	.get("/link/check", async ({ query: { token }, status }) => {
		try {
			return { data: await checkLink(token) };
		} catch (error) {
			const err = linkError.reader(error);
			return status(errorStatus(err.code), wrapError(err.msg));
		}
	}, {
		query: t.Object({ token: t.String({ minLength: 16 }) }),
		response: {
			200: withData(
				t.Object({
					kind: t.UnionEnum(["invite", "referral"]),
					nickname: t.Nullable(t.String()),
				}),
			),
			400: withError(t.String()),
			404: withError(t.String()),
			409: withError(t.String()),
			410: withError(t.String()),
			500: withError(t.String()),
		},
		detail: { summary: buildRouteSummary("Check registration link") },
	});

const linkAccept = new Elysia()
	.use(ipPlugin())
	.onBeforeHandle(async ({ ip, status }) => {
		if (!isProduction) return;

		// Same anti-multi-account heuristic as the password registration.
		if (!(await allowRequest("register:ip", ip, 3, 24 * 60 * 60))) {
			throw status(400, wrapError("IP_RESTRICTIONS"));
		}
	})
	.post("/link/accept", async ({ body: { token, nickname, password, visitorId }, ip, status }) => {
		try {
			const data = nickname
				? await acceptReferral({ token, nickname, password, ip, visitorId })
				: await acceptInvite({ token, password, ip });

			return { data };
		} catch (error) {
			const err = linkError.reader(error);
			return status(errorStatus(err.code), wrapError(err.msg));
		}
	}, {
		body: t.Object({
			token: t.String({ minLength: 16 }),
			password: t.String({ minLength: 8, maxLength: 32 }),
			/** Referral links only: the nickname the player picks. */
			nickname: t.Optional(t.String({ minLength: 3, maxLength: 16 })),
			/** Referral links only: FingerprintJS id, used to block repeat devices. */
			visitorId: t.Optional(t.String({ minLength: 8, maxLength: 64 })),
		}),
		response: {
			200: withData(t.Object({ nickname: t.String() })),
			400: withError(t.String()),
			404: withError(t.String()),
			409: withError(t.String()),
			410: withError(t.String()),
			500: withError(t.String()),
		},
		detail: { summary: buildRouteSummary("Accept registration link") },
	});

export const authLinks = new Elysia()
	.use(linkCheck)
	.use(linkAccept);
