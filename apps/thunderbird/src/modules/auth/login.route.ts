import Elysia, { t } from "elysia";
import bcrypt from "bcryptjs";
import { buildRouteSummary, wrapError } from "#/utils";
import { auth } from "./auth.model";
import { SESSION_KEY, setCookie } from "#/utils/auth/cookie";
import { botValidator, validateAuthStatus } from "#/lib/validators";
import { withData, withError } from "#/shared/schemas";
import { authSchema } from "@repo/shared/schemas/auth";
import { session, loginQR, TOKEN_ERROR_CODES, TOKEN_MSG_RECORDS, qrLogger } from "./login.model";
import { ipPlugin } from "#/lib/plugins/index";
import { defineRequiredUser } from "#/lib/define";
import Bowser from "bowser";
import { nats } from "#/shared/nats/client";
import { logger } from "#/shared/constants/logger";
import type { Subscription } from "@nats-io/nats-core";
import type { QREventsPayload, QREventsEvent, QRValidateTokenPayload } from "@repo/shared/types/entities/auth";
import { isProduction } from "#/shared/env";
import { nanoid } from "nanoid";

const loginSchema = authSchema;

const withPassword = new Elysia()
	.use(botValidator())
	.use(validateAuthStatus())
	.resolve(({ headers }) => ({ ua: headers["user-agent"] }))
	.post(
		"/basic",
		async ({ cookie, status, body: { nickname, password }, ip, ua: userAgentStr }) => {
			const { hash: passwordHash, result: isExist } = await auth.getExistsUser(nickname);

			if (!isExist) throw status(400, wrapError("NOT_EXISTS"));

			const passIsValid = bcrypt.compareSync(password, passwordHash);
			if (!passIsValid) throw status(400, wrapError("PASSWORD_OR_LOGIN_INCORRECT"));

			const { expires_at: expires, token } = await session.create({
				nickname,
				userAgentStr,
				ip,
			});

			setCookie({ cookie, key: SESSION_KEY, expires, value: token });

			return { data: { nickname } };
		},
		{
			body: loginSchema,
			response: {
				200: withData(
					t.Object({
						nickname: t.String(),
					}),
				),
				400: withError(t.UnionEnum(["NOT_EXISTS", "PASSWORD_OR_LOGIN_INCORRECT"])),
				404: withError(),
			},
			detail: {
				summary: buildRouteSummary("Login"),
			},
		},
	);

const tokenSchema = t.Object({
	token: t.String(),
});

const visitorSchema = t.Object({
	visitorId: t.String(),
});

const timers = new Map<string, ReturnType<typeof setInterval>>();
const subs = new Map<string, Subscription>();

export const withQR = new Elysia()
	.use(ipPlugin())
	.resolve(({ headers }) => ({ ua: headers["user-agent"] }))
	.post(
		"/generate",
		async ({ ip, ua: userAgentStr, status, body: { visitorId } }) => {
			if (!userAgentStr || !ip) throw status(403, wrapError("INVALID_REQUEST"));

			const result = await loginQR.generate({
				ip,
				visitorId,
				userAgentStr,
			});

			return { data: result };
		},
		{
			parse: "json",
			body: visitorSchema,
			response: {
				200: withData(
					t.Object({
						token: t.String(),
					}),
				),
				403: withError(t.UnionEnum(["INVALID_REQUEST"])),
			},
			detail: {
				summary: buildRouteSummary("Generate QR code"),
			},
		},
	)
	.ws("/events", {
		query: tokenSchema,
		async open({
			id: wsId,
			data: {
				query: { token },
			},
			...ws
		}) {
			const isExists = await loginQR.checkQRTokenExistence(token);
			if (!isExists) {
				return ws.close(1008, TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]);
			}

			const intervalId = setInterval(() => ws.ping(), 30000);
			timers.set(wsId, intervalId);

			const nc = nats.getInstance();
			const subject = loginQR.getQRSubject(token);

			const sub = nc.subscribe(subject, {
				callback: (err, msg) => {
					if (err) {
						logger.error("NATS callback error:", err);
						return;
					}

					const event = msg.subject.split(".")[2] as QREventsEvent;
					if (!event) return;

					const pd: QREventsPayload = {
						event,
					};

					ws.send(JSON.stringify(pd));

					if (event !== "connected") {
						ws.close(1000);
					}
				},
			});

			subs.set(wsId, sub);

			const pd: QREventsPayload = {
				event: "connected",
			};

			ws.send(JSON.stringify(pd));
		},
		async close(
			{
				id: wsId,
				data: {
					query: { token },
				},
			},
			code,
			reason,
		) {
			clearInterval(timers.get(wsId));
			timers.delete(wsId);

			const sub = subs.get(wsId);

			if (sub) {
				sub.unsubscribe();
				subs.delete(wsId);
			}

			await loginQR.deleteToken(token);

			if (!isProduction) {
				qrLogger.log(`Client closed. Code: ${code}; Reason: ${reason}`);
			}
		},
		detail: {
			summary: buildRouteSummary("Login via QR code"),
		},
	})
	.group("", (app) =>
		app
			.use(defineRequiredUser())
			.post(
				"/confirm",
				async ({ nickname, query: { token }, status }) => {
					const isExists = await loginQR.checkQRTokenExistence(token);
					if (!isExists) {
						throw status(400, wrapError(TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]));
					}

					await loginQR.confirm({ token, nickname });

					return { data: "OK" };
				},
				{
					query: tokenSchema,
					response: {
						200: withData(t.Literal("OK")),
						400: withError(t.UnionEnum([TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]])),
					},
					detail: {
						summary: buildRouteSummary("Confirm QR code"),
					},
				},
			)
			.post(
				"/decline",
				async ({ query: { token }, status }) => {
					const isExists = await loginQR.checkQRTokenExistence(token);
					if (!isExists) {
						throw status(400, wrapError(TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]));
					}

					await loginQR.decline({ token });

					return { data: "OK" };
				},
				{
					query: tokenSchema,
					response: {
						200: withData(t.Literal("OK")),
						400: withError(t.UnionEnum([TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]])),
					},
					detail: {
						summary: buildRouteSummary("Decline QR code"),
					},
				},
			)
			.get(
				"/callback",
				async ({ query: { e, token }, status }) => {
					const CALLBACK_EVENTS: Record<typeof e, () => Promise<{ token: string }>> = {
						verify: async () => {
							const isExists = await loginQR.checkQRTokenExistence(token);
							if (!isExists) {
								throw status(400, wrapError(TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]));
							}

							return { token };
						},
					};

					const event = CALLBACK_EVENTS[e];
					const data = await event?.();

					return { data };
				},
				{
					query: t.Composite([
						tokenSchema,
						t.Object({
							e: t.UnionEnum(["verify"]),
						}),
					]),
					response: {
						200: withData(t.String()),
						400: withError(t.UnionEnum([TOKEN_MSG_RECORDS[TOKEN_ERROR_CODES.TOKEN_EXPIRED]])),
					},
					detail: {
						summary: buildRouteSummary("Callback"),
					},
				},
			),
	)
	.post(
		"/create",
		async ({ cookie, query: { token: qrToken }, status }) => {
			const { vId, ua, ip, verifiedBy } = await loginQR.getData(qrToken);

			if (!verifiedBy) {
				throw status(400, wrapError("LOGIN_NOT_VERIFIED"));
			}

			const { expires_at: expires, token: sessionToken } = await session.create({
				userAgentStr: ua,
				ip,
				nickname: verifiedBy,
			});

			await loginQR.afterCreateSession({ qrToken });

			setCookie({
				cookie,
				key: SESSION_KEY,
				expires,
				value: sessionToken,
			});

			const data = { nickname: verifiedBy };
			return { data };
		},
		{
			query: tokenSchema,
			response: {
				200: withData(
					t.Object({
						nickname: t.String(),
					}),
				),
				400: withError(t.UnionEnum(["LOGIN_NOT_VERIFIED"])),
				500: withError(),
			},
			detail: {
				summary: buildRouteSummary("Create session"),
			},
		},
	)
	.get(
		"/validate",
		async ({ query: { token } }) => {
			const isExists = await loginQR.checkQRTokenExistence(token);
			if (!isExists) return { data: false };

			const pd = await loginQR.getData(token);
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
		},
		{
			query: tokenSchema,
			response: {
				200: withData(
					t.Union([
						t.Object({
							browser: t.String(),
							geo: t.Object({
								city: t.String(),
								country: t.String(),
							}),
							timestampz: t.Union([t.String(), t.Date()]),
						}),
						t.Boolean(),
					]),
				),
				500: withError(),
			},
			detail: {
				summary: buildRouteSummary("Validate QR code"),
			},
		},
	);

export const withGame = new Elysia()
	.resolve(({ headers }) => ({ ua: headers["user-agent"] }))
	.post(
		"/generate",
		async ({ ua, status, body: { visitorId } }) => {
			if (!ua) throw status(403, wrapError("INCORRECT_REQUEST"));

			const code = nanoid(6);

			return {
				data: {
					code: code,
				},
			};
		},
		{
			parse: "json",
			body: visitorSchema,
			response: {
				200: withData(
					t.Object({
						code: t.String(),
					}),
				),
				403: withError(t.UnionEnum(["INCORRECT_REQUEST"])),
			},
			detail: {
				summary: buildRouteSummary("Generate game code"),
			},
		},
	);

export const login = new Elysia().group("/login", (app) =>
	app
		.use(withPassword)
		.group("/qr", (app) => app.use(withQR))
		.group("/game", (app) => app.use(withGame)),
);
