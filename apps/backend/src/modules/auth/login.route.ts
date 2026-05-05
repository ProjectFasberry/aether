import Elysia, { t } from "elysia";
import bcrypt from "bcryptjs";
import { wrapError } from "#/helpers/wrap-error";
import { auth } from "./auth.model";
import { SESSION_KEY, setCookie } from "#/utils/auth/cookie";
import { botValidator, validateAuthStatus } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { authSchema } from "@repo/shared/schemas/auth";
import { session, loginQR as loginQRService, TOKEN_ERROR_CODES, TOKEN_MSG_RECORDS, qrLogger } from "./login.model";
import { ipPlugin } from "#/lib/plugins/index";
import { defineUser } from "#/lib/define";
import Bowser from "bowser";
import { getNats } from "#/shared/nats/client";
import { logger } from "#/utils/config/logger";
import type { Subscription } from "@nats-io/nats-core";
import type { QREventsPayload, QREventsEvent, QRValidateTokenPayload } from "@repo/shared/schemas/auth/login"
import { isProduction } from "#/shared/env";
import { nanoid } from "nanoid";

const loginSchema = authSchema;

const withPassword = new Elysia()
	.use(botValidator())
	.use(validateAuthStatus())
	.resolve(({ headers }) => ({ ua: headers["user-agent"] }))
	.post("/basic", async ({ cookie, status, body: { nickname, password }, ip, ua }) => {
		const { hash, result: isExist } = await auth.getExistsUser(nickname);

		if (!isExist) throw status(400, wrapError("NOT_EXISTS"));

		const passIsValid = bcrypt.compareSync(password, hash);
		if (!passIsValid) throw status(400, wrapError("PASSWORD_OR_LOGIN_INCORRECT"));

		const { expires_at: expires, token } = await session.create({
			nickname,
			userAgentStr: ua,
			ip,
		});

		setCookie({ cookie, key: SESSION_KEY, expires, value: token });

		return { data: { nickname } };
	}, {
		body: loginSchema,
		response: {
			200: withData(
				t.Object({
					nickname: t.String()
				})
			),
			400: withError(
				t.UnionEnum([
					"NOT_EXISTS",
					"PASSWORD_OR_LOGIN_INCORRECT"
				])
			),
			404: withError(),
		},
	});

const tokenSchema = t.Object({
	token: t.String(),
});

const visitorSchema = t.Object({
	visitorId: t.String(),
});

const timers = new Map<string, ReturnType<typeof setInterval>>();
const subs = new Map<string, Subscription>()

export const withQR = new Elysia()
	.use(ipPlugin())
	.resolve(({ headers }) => ({ ua: headers["user-agent"] }))
	.post("/generate", async ({ ip, ua, status, body: { visitorId } }) => {
		if (!ua || !ip) {
			logger.error("Missing ua or ip on request")
			throw status(403, wrapError("INVALID_REQUEST"));
		}

		const result = await loginQRService.generate({
			ip, visitorId, ua
		});

		return { data: result };
	}, {
		parse: "json",
		body: visitorSchema,
		response: {
			200: withData(
				t.Object({
					token: t.String()
				})
			),
			403: withError(
				t.UnionEnum([
					"INVALID_REQUEST"
				])
			)
		}
	})
	.ws("/events", {
		query: tokenSchema,
		async open({ id: wsId, data: { query: { token } }, ...ws }) {
			const isExists = await loginQRService.checkQRTokenExistence(token);
			if (!isExists) {
				return ws.close(1008, TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]);
			}

			const intervalId = setInterval(() => ws.ping(), 30000);
			timers.set(wsId, intervalId);

			const nc = getNats()
			const subject = loginQRService.getAuthQRSubject(token)

			const sub = nc.subscribe(subject, {
				callback: (err, msg) => {
					if (err) {
						logger.error("NATS callback error:", err);
						return;
					}

					const event = msg.subject.split(".")[2] as QREventsEvent
					if (!event) return;

					const pd: QREventsPayload = {
						event
					}

					ws.send(JSON.stringify(pd))

					if (event !== 'connected') {
						ws.close(1000)
					}
				}
			})

			subs.set(wsId, sub)

			const pd: QREventsPayload = {
				event: "connected"
			}

			ws.send(JSON.stringify(pd))
		},
		async close({ id: wsId, data: { query: { token } } }, code, reason) {
			clearInterval(timers.get(wsId));
			timers.delete(wsId);

			const sub = subs.get(wsId)

			if (sub) {
				sub.unsubscribe()
				subs.delete(wsId)
			}

			await loginQRService.deleteToken(token)

			if (!isProduction) {
				qrLogger.log(`Client closed. Code: ${code}; Reason: ${reason}`)
			}
		}
	})
	.group("", (app) => app
		.use(defineUser())
		.post("/confirm", async ({ nickname, query: { token }, status }) => {
			const isExists = await loginQRService.checkQRTokenExistence(token);
			if (!isExists) {
				throw status(400, wrapError(TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]));
			}

			await loginQRService.confirm({ token, nickname });

			return { data: "OK" };
		}, {
			query: tokenSchema,
			response: {
				200: withData(
					t.Literal("OK")
				),
				400: withError(
					t.UnionEnum([
						TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]
					])
				)
			}
		})
		.post("/decline", async ({ query: { token }, status }) => {
			const isExists = await loginQRService.checkQRTokenExistence(token);
			if (!isExists) {
				throw status(400, wrapError(TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]));
			}

			await loginQRService.decline({ token })

			return { data: "OK" };
		}, {
			query: tokenSchema,
			response: {
				200: withData(
					t.Literal("OK")
				),
				400: withError(
					t.UnionEnum([
						TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]
					])
				)
			}
		})
		.get("/callback", async ({ query: { e, token }, status }) => {
			const CALLBACK_EVENTS: Record<typeof e, () => Promise<{ token: string }>> = {
				"verify": async () => {
					const isExists = await loginQRService.checkQRTokenExistence(token);
					if (!isExists) {
						throw status(400, wrapError(TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]));
					}

					return { token }
				}
			}

			const event = CALLBACK_EVENTS[e]
			const data = await event?.()

			return { data }
		}, {
			query: t.Composite([
				tokenSchema,
				t.Object({
					e: t.UnionEnum(["verify"])
				})
			]),
			response: {
				200: withData(t.String()),
				400: withError(
					t.UnionEnum([
						TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]
					])
				)
			}
		})
	)
	.post("/create", async ({ cookie, query: { token: qrToken }, status }) => {
		const { vId, ua, ip, verifiedBy } = await loginQRService.getData(qrToken)

		if (!verifiedBy) {
			throw status(400, wrapError("LOGIN_NOT_VERIFIED"))
		}

		const { expires_at: expires, token: sessionToken } = await session.create({
			userAgentStr: ua, ip, nickname: verifiedBy
		});

		await loginQRService.afterCreateSession({ qrToken })

		setCookie({
			cookie, key: SESSION_KEY, expires, value: sessionToken
		});

		const data = { nickname: verifiedBy }
		return { data };
	}, {
		query: tokenSchema,
		response: {
			200: withData(
				t.Object({
					nickname: t.String()
				})
			),
			400: withError(
				t.UnionEnum([
					"LOGIN_NOT_VERIFIED"
				])
			),
			500: withError()
		}
	})
	.get("/validate", async ({ query: { token } }) => {
		const isExists = await loginQRService.checkQRTokenExistence(token);
		if (!isExists) return { data: false };

		const pd = await loginQRService.getData(token);
		const parsedUA = Bowser.parse(pd.ua);

		const geo = {
			city: "Unknown",
			country: "Unknown",
		};

		const data: QRValidateTokenPayload = {
			browser: parsedUA.browser.name ?? "Unknown",
			geo: {
				city: geo.city,
				country: geo.country,
			},
			timestampz: pd.timestampz,
		};

		return { data };
	}, {
		query: tokenSchema,
		response: {
			200: withData(
				t.Union([
					t.Object({
						browser: t.String(),
						geo: t.Object({
							city: t.String(),
							country: t.String()
						}),
						timestampz: t.Union([
							t.String(), t.Date()
						])
					}),
					t.Boolean()
				])
			),
			500: withError()
		}
	});

export const withGame = new Elysia()
	.resolve(({ headers }) => ({ ua: headers["user-agent"] }))
	.post("/generate", async ({ ua, status, body: { visitorId } }) => {
		if (!ua) throw status(403, wrapError("INCORRECT_REQUEST"));

		const code = nanoid(6)

		return {
			data: {
				code: code
			}
		};
	}, {
		parse: "json",
		body: visitorSchema,
		response: {
			200: withData(
				t.Object({
					code: t.String()
				})
			),
			403: withError(
				t.UnionEnum([
					"INCORRECT_REQUEST"
				])
			)
		}
	});

export const login = new Elysia()
	.group("/login", (app) => app
		.use(withPassword)
		.group("/qr", (app) => app
			.use(withQR)
		)
		.group("/game", (app) => app
			.use(withGame)
		),
	);