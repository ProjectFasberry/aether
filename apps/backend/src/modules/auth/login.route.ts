import Elysia, { t } from "elysia";
import bcrypt from "bcryptjs";
import { wrapError } from "#/helpers/wrap-error";
import { auth } from "./auth.model";
import { SESSION_KEY, setCookie } from "#/utils/auth/cookie";
import { botValidator, validateAuthStatus } from "#/lib/middlewares/validators";
import { withData, withError } from "#/shared/schemas";
import { authSchema } from "@repo/shared/schemas/auth";
import { session, loginQR as loginQRService, TOKEN_ERROR_CODES, TOKEN_MSG_RECORDS } from "./login.model";
import { ipPlugin } from "#/lib/plugins/ip";
import { defineUser } from "#/lib/middlewares/define";
import Bowser from "bowser";
import { getNats } from "#/shared/nats/client";
import { logger } from "#/utils/config/logger";
import type { Subscription } from "@nats-io/nats-core";
import type { QREventsPayload, QREventsEvent, QRValidateTokenPayload } from "@repo/shared/schemas/auth/login"

const loginSchema = authSchema;

const withPassword = new Elysia()
	.use(botValidator())
	.use(validateAuthStatus())
	.model({
		login: withData(t.Object({ nickname: t.String() })),
	})
	.resolve(({ headers }) => ({ ua: headers["user-agent"] }))
	.post("/basic", async ({ cookie, status, body: { nickname, password }, ip, ua }) => {
		const { hash, result: isExist } = await auth.getExistsUser(nickname);

		if (!isExist) throw status(400, wrapError("not-exists"));

		const passIsValid = bcrypt.compareSync(password, hash);
		if (!passIsValid) throw status(400, wrapError("invalid"));

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
			200: "login",
			400: withError,
			404: withError,
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
		if (!ua || !ip) throw status(403);

		const result = await loginQRService.generate({
			ip, visitorId, ua
		});

		return { data: result };
	}, {
		parse: "json",
		body: visitorSchema,
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
		async close({ id: wsId, data: { query: { token } }, ...ws }, code, reason) {
			clearInterval(timers.get(wsId));
			timers.delete(wsId);

			const sub = subs.get(wsId)

			if (sub) {
				sub.unsubscribe()
				subs.delete(wsId)
			}

			loginQRService.deleteToken(token)

			console.log(`Client closed. Code: ${code}; Reason: ${reason}`)
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

			return { data: "ok" };
		}, {
			query: tokenSchema,
		})
		.post("/decline", async ({ query: { token }, status }) => {
			const isExists = await loginQRService.checkQRTokenExistence(token);
			if (!isExists) {
				throw status(400, wrapError(TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]));
			}

			await loginQRService.decline({ token })

			return { data: "ok" };
		}, {
			query: tokenSchema,
		})
		.get("/callback", async ({ query: { e, token }, status, redirect }) => {
			if (e === "verify") {
				const isExists = await loginQRService.checkQRTokenExistence(token);
				if (!isExists) {
					throw status(400, wrapError(TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]));
				}

				return { data: { token } }
			}
		}, {
			query: t.Intersect([
				tokenSchema,
				t.Object({ e: t.UnionEnum(["verify"]) })
			]),
		})
	)
	.post("/create", async ({ cookie, query: { token: qrToken }, status }) => {
		const { vId, ua, ip, verifiedBy } = await loginQRService.getData(qrToken)

		if (!verifiedBy) {
			throw status(400, wrapError("Login is not verified"))
		}

		const { expires_at: expires, token: sessionToken } = await session.create({
			userAgentStr: ua, ip, nickname: verifiedBy
		});

		await loginQRService.afterCreateSession({ qrToken })

		setCookie({ 
			cookie, key: SESSION_KEY, expires, value: sessionToken 
		});

		return { data: { nickname: verifiedBy } };
	}, {
		query: tokenSchema,
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
	});

export const withGame = new Elysia()
	.resolve(({ headers }) => ({ ua: headers["user-agent"] }))
	.post("/generate", async ({ ua, status, body: { visitorId } }) => {
		if (!ua) throw status(403);

		return { data: null };
	}, {
		parse: "json",
		body: visitorSchema,
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