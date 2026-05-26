import { client } from "@/shared/lib/client-wrapper";
import { invariant } from "@/shared/lib/invariant";
import { action, atom } from "@reatom/framework";
import { type AsyncCtx, reatomAsync, spawn, withAssign, withDataAtom, withErrorAtom, withReset, withStatusesAtom } from "@reatom/framework";
import { onEvent } from "@reatom/web";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { type AuthErrorType, authState, defineError, isPofActiveAtom } from "./auth.model";
import { createWsUrl } from "@/shared/lib/utils";
import { env } from "@/shared/env";
import { pof } from "../../../../models/shared.model";
import { logError } from "@/shared/lib/log";
import * as z from "zod";
import { authSchema as loginSchema } from "@/shared/schemas/auth";
import { spyOptionAtom } from "@/shared/models/app/utils";

export type QREventsEvent =
	| "expired"
	| "verified"
	| "connected" // ws only event
	| "declined";

export type QREventsPayload = {
	event: QREventsEvent;
};

type QRGeneratePayload = ExtractApiData<"postAuthLoginQrGenerate">["data"]
type GameGeneratePayload = ExtractApiData<"postAuthLoginGameGenerate">["data"]
type QRValidateTokenPayload = ExtractApiData<"getAuthLoginQrValidate">["data"]

export type AuthLoginVariant = "qr" | "game" | "password";
export type AuthLoginQRStatus = QREventsEvent | "idle"

const LOGIN_VARIANTS_EVENTS: Partial<Record<AuthLoginVariant, (ctx: AsyncCtx) => void>> = {
  qr: (ctx) => login.qr.generate(ctx),
  game: (ctx) => login.game.generate(ctx),
};

export const loginState = atom(null, "loginState").pipe(
  withAssign((_, name) => ({
    qr: atom(null, `${name}.qr`).pipe(
      withAssign(() => ({
        socket: atom<WebSocket | null>(null, `${name}.socket`).pipe(withReset()),
        url: atom<string | null>(null, `${name}.qrUrl`).pipe(withReset()),
        token: atom<string | null>(null, `${name}.token`).pipe(withReset()),
        status: atom<AuthLoginQRStatus>("idle", `${name}.status`).pipe(withReset()),
        verify: atom(null, `${name}.verify`).pipe(
          withAssign((_, name) => ({
            status: atom<"idle" | "confirmed" | "declined">("idle", `${name}.status`).pipe(withReset()),
            token: atom<string | null>(null, `${name}.token`).pipe(withReset())
          }))
        )
      })),
    ),
    game: atom(null, `${name}.game`).pipe(
      withAssign((_, name) => ({
        code: atom<string | null>(null, `${name}.code`).pipe(withReset()),
      })),
    ),
  })),
);

loginState.qr.status.onChange((ctx, state) => {
  if (state === 'verified') {
    spawn(ctx, (spawnCtx) => login.qr.createSession(spawnCtx))
  }
})

export const login = atom(null, "login").pipe(
  withAssign((_, name) => ({
    getVisitorId: async () => {
      const fpPromise = FingerprintJS.load();
      const fp = await fpPromise;
      const result = await fp.get();
      return result.visitorId;
    },
    basic: atom(null, `${name}.basic`).pipe(
      withAssign(() => ({
        submit: reatomAsync(async (ctx) => {
          const pofIsActive = spyOptionAtom(ctx, "flags", "isPof", true)
          const token = ctx.get(pof.token);

          if (pofIsActive && !token) {
            pof.showTokenVerifySectionAtom(ctx, true);
            return;
          }

          authState.isProcessing(ctx, true);

          const raw = {
            nickname: ctx.get(authState.fields.nickname),
            password: ctx.get(authState.fields.password),
          };

          const { success, error, data } = loginSchema.safeParse(raw);
          if (!success) return error;

          return await client
            .post(`auth/login/basic`, {
              searchParams: {
                token: token ?? ""
              },
              throwHttpErrors: false,
              timeout: 10000,
              json: data
            })
            .exec()
        }, {
          name: `${name}.submit`,
          onFulfill: (ctx, res) => {
            if (!res) return;

            if (res instanceof z.ZodError) {
              const issue = res.issues.map((d) => d)[0];
              const property = issue.path[0].toString() as AuthErrorType;

              authState.globalError(ctx, issue.message);
              authState.errorsType(ctx, (state) => [...state, property]);
              authState.isProcessing(ctx, false);

              return;
            }

            login.afterEvent(ctx)
          },
          onReject: (ctx, e) => {
            logError(e);
            authState.isProcessing(ctx, false);

            defineError(ctx, e)
          }
        }).pipe(
          withErrorAtom(),
          withStatusesAtom()
        )
      }))
    ),
    afterEvent: action((ctx) => ctx.schedule(() => window.location.reload())),
    qr: atom(null, `${name}.qr`).pipe(
      withAssign((_, name) => ({
        generate: reatomAsync(async (ctx) => {
          const visitorId = await login.getVisitorId();

          const res = await client
            .post<QRGeneratePayload>("auth/login/qr/generate", { json: { visitorId } })
            .exec();

          const pdUrl = new URL(`${env.VITE_API_URL}/auth/login/qr/verify`)
          pdUrl.searchParams.append("token", res.token)

          loginState.qr.url(ctx, pdUrl.href);
          loginState.qr.token(ctx, res.token)

          login.qr.events(ctx, res.token)
        }, `${name}.generate`).pipe(
          withStatusesAtom(),
          withErrorAtom(),
        ),
        createSession: reatomAsync(async (ctx) => {
          const token = ctx.get(loginState.qr.token);
          invariant(token, "Token is not defined");

          return await client
            .post<{ nickname: string }>("auth/login/qr/create", {
              searchParams: { token }
            })
            .exec()
        }, {
          name: `${name}.createSession`,
          onFulfill: (ctx) => login.afterEvent(ctx)
        }),
        events: reatomAsync(async (ctx, token: string) => {
          const currSocket = ctx.get(loginState.qr.socket)

          if (currSocket) {
            currSocket.close()
            loginState.qr.socket(ctx, null)
          }

          const wsUrl = createWsUrl({
            host: env.VITE_API_HOST,
            isSecure: import.meta.env.PROD,
            path: `auth/login/qr/events?token=${token}`
          })

          const socket = new WebSocket(wsUrl)
          loginState.qr.socket(ctx, socket)

          if (socket.readyState !== WebSocket.OPEN) {
            await onEvent(ctx, socket, 'open')
          }

          onEvent(ctx, socket, 'message', ({ data: raw }) => {
            const data = JSON.parse(raw) as QREventsPayload
            loginState.qr.status(ctx, data.event)
          })
          onEvent(ctx, socket, 'open', () => {
            loginState.qr.status(ctx, "connected")
          })
          onEvent(ctx, socket, 'close', () => {
            ctx.controller.abort()
          })
          onEvent(ctx, socket, 'error', () => {
            loginState.qr.status.reset(ctx)
            ctx.controller.abort()
          })
        }, `${name}.events`),
        verify: atom(null, `${name}.verify`).pipe(
          withAssign((_, name) => ({
            validateToken: reatomAsync(async (ctx, token: string) => {
              const result = await ctx.schedule(() =>
                client<QRValidateTokenPayload>("auth/login/qr/validate", { searchParams: { token } }).exec(),
              );

              return { result, params: { token } }
            }, {
              name: `${name}.validateToken`,
              onFulfill: (ctx, { result, params: { token } }) => {
                loginState.qr.verify.status(ctx, "idle")
                loginState.qr.verify.token(ctx, token)
              }
            }).pipe(
              withStatusesAtom(),
              withErrorAtom(),
              withDataAtom()
            ),
            confirm: reatomAsync(async (ctx) => {
              const token = ctx.get(loginState.qr.verify.token);
              invariant(token, "Token is not defined");

              return await client
                .post<"ok">("auth/login/qr/confirm", {
                  searchParams: { token }
                })
                .exec()
            }, {
              name: `${name}.confirm`,
              onFulfill: (ctx) => {
                loginState.qr.verify.status(ctx, "confirmed")
              }
            }).pipe(
              withStatusesAtom(),
              withErrorAtom()
            ),
            decline: reatomAsync(async (ctx) => {
              const token = ctx.get(loginState.qr.verify.token);
              invariant(token, "Token is not defined");

              return await client
                .post<"ok">("auth/login/qr/decline", {
                  searchParams: { token }
                })
                .exec()
            }, {
              name: `${name}.decline`,
              onFulfill: (ctx) => {
                loginState.qr.verify.status(ctx, "declined")
              }
            }).pipe(
              withStatusesAtom(),
              withErrorAtom()
            ),
          }))
        ),
      })),
    ),
    game: atom(null, `${name}.game`).pipe(
      withAssign((_, name) => ({
        generate: reatomAsync(async (ctx) => {
          const visitorId = await login.getVisitorId();

          const res = await client
            .post<GameGeneratePayload>("auth/login/game/generate", { json: { visitorId } })
            .exec();

          loginState.game.code(ctx, res.code);
        }, `${name}.generate`).pipe(
          withStatusesAtom(),
          withErrorAtom()
        ),
      })),
    ),
  })),
);

export const authLoginVariantAtom = atom<AuthLoginVariant>("password", "authLoginVariant").pipe(
  withAssign((target, name) => ({
    select: reatomAsync(async (ctx, variant: AuthLoginVariant) => {
      target(ctx, variant);
      LOGIN_VARIANTS_EVENTS[variant]?.(ctx);
    }),
    filterVariants: <T extends { value: AuthLoginVariant }>(variants: T[]) =>
      atom((ctx) => variants.filter((d) => d.value !== ctx.spy(target))),
  })),
);

export const showResetPasswordAtom = atom((ctx) =>
  ctx.spy(authState.type) === "login" && ctx.spy(authLoginVariantAtom) === "password",
  "showResetPassword",
);

export const authLoginQRIsErrorAtom = atom((ctx) =>
  ctx.spy(login.qr.verify.confirm.errorAtom) || ctx.spy(login.qr.verify.decline.errorAtom),
);

const authIsValidAtom = atom<boolean>((ctx) => {
  const type = ctx.spy(authState.type);

  const { nickname, password, findout, acceptRules } = {
    nickname: ctx.spy(authState.fields.nickname),
    password: ctx.spy(authState.fields.password),
    findout: ctx.spy(authState.fields.findout),
    acceptRules: ctx.spy(authState.fields.acceptRules)
  }

  const isBaseValid = nickname.length >= 2 && password.length >= 6;
  if (!isBaseValid) return false;

  if (type !== "register") return true;

  return !!findout && !!acceptRules;
}, "authIsValid");

export const authSubmitIsDisabledAtom = atom((ctx) => {
  const isPending = ctx.spy(login.basic.submit.statusesAtom).isPending;
  const isInvalid = !ctx.spy(authIsValidAtom);
  const isPofActive = ctx.spy(isPofActiveAtom)
  return isPofActive || isPending || isInvalid;
}, "authSubmitIsDisabled");
