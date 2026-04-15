import Elysia, { t } from "elysia";
import bcrypt from "bcryptjs";
import { wrapError } from "#/helpers/wrap-error";
import { getExistsUser } from "./auth.model";
import { HttpStatusEnum } from "elysia-http-status-code/status";
import { SESSION_KEY, setCookie } from "#/utils/auth/cookie";
import { botValidator, validateAuthStatus } from "#/lib/middlewares/validators";
import { withData, withError } from "#/shared/schemas";
import { authSchema } from "@repo/shared/schemas/auth";
import { createSession, loginQR as loginQRService, qrLogger } from "./login.model";
import { ipPlugin } from "#/lib/plugins/ip";
import { defineUser } from "#/lib/middlewares/define";
import Bowser from "bowser";

const loginSchema = authSchema;

const passwordRoute = new Elysia()
	.use(botValidator())
	.use(validateAuthStatus())
	.model({
		login: withData(t.Object({ nickname: t.String() })),
	})
	.resolve(({ headers }) => ({ userAgent: headers["user-agent"] }))
	.post(
		"/",
		async ({ cookie, status, body: { nickname, password }, ip, userAgent: userAgentStr }) => {
			const { hash, result: isExist } = await getExistsUser(nickname);

			if (!isExist) throw status(HttpStatusEnum.HTTP_404_NOT_FOUND, wrapError("not-exists"));

			const passIsValid = bcrypt.compareSync(password, hash);
			if (!passIsValid) throw status(HttpStatusEnum.HTTP_400_BAD_REQUEST, wrapError("invalid"));

			const { expires_at: expires, token } = await createSession({
				nickname,
				userAgentStr,
				ip,
			});

			setCookie({ cookie, key: SESSION_KEY, expires, value: token });

			const data = { nickname };
			return { data };
		},
		{
			body: loginSchema,
			response: {
				200: "login",
				400: withError,
				404: withError,
			},
		},
	);

const tokenSchema = t.Object({
	token: t.String(),
});

const visitorSchema = t.Object({
	visitorId: t.String(),
});

export const loginQR = new Elysia()
	.use(ipPlugin())
	.resolve(({ headers }) => ({ userAgent: headers["user-agent"] }))
	.post(
		"/generate",
		async ({ ip, userAgent: ua, status, body: { visitorId } }) => {
			qrLogger.log({ ua, visitorId });

			if (!ua || !ip) throw status(HttpStatusEnum.HTTP_403_FORBIDDEN);

			const result = await loginQRService().generate({ ip, visitorId, ua });
			return { data: result };
		},
		{
			parse: "json",
			body: visitorSchema,
		},
	)
	.group("", (app) =>
		app
			.use(defineUser())
			.post(
				"/confirm",
				async ({ nickname, query: { token }, session, status }) => {
					const isExists = await loginQRService().getQRTokenIsExists(token);
					if (!isExists) throw status(HttpStatusEnum.HTTP_400_BAD_REQUEST, wrapError("Token is expired or not found"));

					const result = await loginQRService().confirm(token);

					return { data: null };
				},
				{
					query: t.Object({
						token: t.String(),
					}),
				},
			)
			.post(
				"/decline",
				async ({ nickname, query: { token }, session, status }) => {
					const isExists = await loginQRService().getQRTokenIsExists(token);
					if (!isExists) throw status(HttpStatusEnum.HTTP_400_BAD_REQUEST, wrapError("Token is expired or not found"));

					return { data: null };
				},
				{
					query: tokenSchema,
				},
			)
			.get(
				"/callback",
				async ({ nickname, query: { e, token }, status, redirect }) => {
					qrLogger.log(`QR login with event '${e}' for '${nickname}'`);

					if (e === "verify") {
						const isExists = await loginQRService().getQRTokenIsExists(token);
						if (!isExists)
							throw status(HttpStatusEnum.HTTP_400_BAD_REQUEST, wrapError("Token is expired or not found"));

						const redirectUrl = loginQRService().getConfirmRedirectUrl(token);
						qrLogger.log(`Redirect to ${redirectUrl} for '${nickname}`);
						return redirect(redirectUrl);
					}
				},
				{
					query: t.Intersect([tokenSchema, t.Object({ e: t.UnionEnum(["verify"]) })]),
				},
			)
			.ws("/events", {
				message(ws, message) {
					ws.send(message);
				},
			}),
	)
	.get(
		"/create",
		async ({ cookie, query: { token } }) => {
			const { vId, ua, ip, nickname } = await loginQRService().getData(token);
			const { expires_at: expires } = await createSession({ userAgentStr: ua, ip, nickname });

			setCookie({ cookie, key: SESSION_KEY, expires, value: token });
			return { data: { nickname } };
		},
		{
			query: tokenSchema,
		},
	)
	.get(
		"/validate",
		async ({ query: { token } }) => {
			const isExists = await loginQRService().getQRTokenIsExists(token);
			if (!isExists) return { data: false };

			type ValidateTokenPayload = {
				browser: string;
				geo: {
					city: string;
					country: string;
				};
				timestampz: string;
			};

			const pd = await loginQRService().getData(token);
			const parsedUA = Bowser.parse(pd.ua);

			const geo = {
				city: "Unknown",
				country: "Unknown",
			};

			const data: ValidateTokenPayload = {
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
		},
	);

export const loginGame = new Elysia()
	.resolve(({ headers }) => ({ userAgent: headers["user-agent"] }))
	.post(
		"/generate",
		async ({ userAgent: ua, status, body: { visitorId } }) => {
			console.log(ua, visitorId);

			if (!ua) throw status(HttpStatusEnum.HTTP_403_FORBIDDEN);

			return { data: null };
		},
		{
			parse: "json",
			body: visitorSchema,
		},
	);

export const login = new Elysia().group("/login", (app) =>
	app
		.use(passwordRoute)
		.group("/qr", (app) => app.use(loginQR))
		.group("/game", (app) => app.use(loginGame)),
);
