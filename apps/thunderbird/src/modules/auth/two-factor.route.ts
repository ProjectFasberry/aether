import Elysia, { t } from "elysia";
import { defineRequiredSession } from "#/lib/define";
import { withData, withError } from "#/shared/schemas";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import {
	confirmTwoFactorSetup,
	disableTwoFactor,
	getTwoFactorStatus,
	startTwoFactorSetup,
} from "./two-factor.model";

const codeSchema = t.String({ minLength: 6, maxLength: 20 });

export const twoFactor = new Elysia()
	.use(defineRequiredSession())
	.group("/2fa", (app) => app
		.get("/status", async ({ nickname }) => {
			return { data: await getTwoFactorStatus(nickname) };
		}, {
			response: {
				200: withData(t.Object({
					enabled: t.Boolean(),
					backupCodesRemaining: t.Number(),
				})),
			},
			detail: { summary: buildRouteSummary("Get two-factor status") },
		})
		.post("/setup", async ({ nickname, status }) => {
			try {
				const data = await startTwoFactorSetup(nickname);
				if (!data) return status(404, wrapError("NOT_FOUND"));

				return { data };
			} catch (error) {
				if (error instanceof Error && error.message === "TWO_FACTOR_ALREADY_ENABLED") {
					return status(409, wrapError("TWO_FACTOR_ALREADY_ENABLED"));
				}

				throw error;
			}
		}, {
			response: {
				200: withData(t.Object({ secret: t.String(), otpauth: t.String() })),
				404: withError(t.String()),
				409: withError(t.UnionEnum(["TWO_FACTOR_ALREADY_ENABLED"])),
			},
			detail: { summary: buildRouteSummary("Start two-factor setup") },
		})
		.post("/confirm", async ({ nickname, body: { code }, status }) => {
			const backupCodes = await confirmTwoFactorSetup(nickname, code);
			if (!backupCodes) return status(400, wrapError("TWO_FACTOR_INVALID"));

			return { data: { backupCodes } };
		}, {
			body: t.Object({ code: codeSchema }),
			response: {
				200: withData(t.Object({ backupCodes: t.Array(t.String()) })),
				400: withError(t.UnionEnum(["TWO_FACTOR_INVALID"])),
			},
			detail: { summary: buildRouteSummary("Confirm two-factor setup") },
		})
		.post("/disable", async ({ nickname, body: { password, code }, status }) => {
			const result = await disableTwoFactor(nickname, password, code);
			if (!result) return status(400, wrapError("TWO_FACTOR_INVALID"));

			return { data: "OK" as const };
		}, {
			body: t.Object({
				password: t.String({ minLength: 1, maxLength: 72 }),
				code: codeSchema,
			}),
			response: {
				200: withData(t.Literal("OK")),
				400: withError(t.UnionEnum(["TWO_FACTOR_INVALID"])),
			},
			detail: { summary: buildRouteSummary("Disable two-factor") },
		}),
	);
