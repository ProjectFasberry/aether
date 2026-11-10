import Elysia, { t } from "elysia";
import { validatePermission } from "#/lib/validators";
import { permissionsService } from "#/shared/constants/permissions";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import {
	RATE_CURRENCIES,
	addRate,
	convert,
	currentRates,
	deleteRate,
	rateHistory,
	updateRate,
} from "#/modules/economy/rates.model";
import { createAdminActivityLog } from "../private.model";

const currency = t.UnionEnum(RATE_CURRENCIES);

const addSchema = t.Object({
	from: currency,
	to: currency,
	rate: t.Number({ exclusiveMinimum: 0, maximum: 1_000_000_000 }),
	spread: t.Optional(t.Number({ minimum: 0, maximum: 0.99 })),
	effectiveFrom: t.Optional(t.String({ maxLength: 64 })),
});

const convertSchema = t.Object({
	amount: t.String({ minLength: 1, maxLength: 24 }),
	from: currency,
	to: currency,
});

function parseDate(value: string | undefined): Date | null | undefined {
	if (!value) return undefined;

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export const economyRates = new Elysia()
	.use(validatePermission(permissionsService.get("ECONOMY.READ")))
	.get("/rates", async () => {
		const [current, history] = await Promise.all([
			currentRates(),
			rateHistory({ limit: 50 }),
		]);

		return { data: { current, history } };
	}, {
		detail: {
			summary: buildRouteSummary("List exchange rates"),
		},
	})
	.get("/rates/convert", async ({ query, status }) => {
		const amount = Number(query.amount);
		if (!Number.isFinite(amount) || amount < 0) return status(400, wrapError("INVALID_AMOUNT"));

		const conversion = await convert({ amount, from: query.from, to: query.to });
		if (!conversion) return status(400, wrapError("RATE_NOT_FOUND"));

		return { data: conversion };
	}, {
		query: convertSchema,
		detail: {
			summary: buildRouteSummary("Preview a currency conversion"),
		},
	});

export const economyRateAdd = new Elysia()
	.use(validatePermission(permissionsService.get("ECONOMY.WRITE")))
	.post("/rates", async ({ body, status }) => {
		if (body.from === body.to) return status(400, wrapError("SAME_CURRENCY"));

		const effectiveFrom = parseDate(body.effectiveFrom);
		if (effectiveFrom === null) return status(400, wrapError("INVALID_DATE"));

		const rate = await addRate({
			from: body.from,
			to: body.to,
			rate: body.rate,
			spread: body.spread ?? 0,
			effectiveFrom,
		});

		return { data: rate };
	}, {
		body: addSchema,
		afterResponse: ({ permission, nickname: initiator, body }) => {
			void createAdminActivityLog({
				event: permission,
				initiator,
				severity: "warning",
				metadata: {
					from: body.from,
					to: body.to,
					rate: body.rate,
					spread: body.spread ?? 0,
					effectiveFrom: body.effectiveFrom ?? null,
				},
			});
		},
		detail: {
			summary: buildRouteSummary("Add an exchange rate"),
		},
	})
	.patch("/rates/:id", async ({ params, body, status }) => {
		const effectiveFrom = parseDate(body.effectiveFrom);
		if (effectiveFrom === null) return status(400, wrapError("INVALID_DATE"));

		const rate = await updateRate({
			id: params.id,
			rate: body.rate,
			spread: body.spread,
			effectiveFrom,
		});

		if (!rate) return status(404, wrapError("RATE_NOT_FOUND"));

		return { data: rate };
	}, {
		params: t.Object({ id: t.Number() }),
		body: t.Partial(addSchema),
		afterResponse: ({ permission, nickname: initiator, params, body }) => {
			void createAdminActivityLog({
				event: permission,
				initiator,
				severity: "warning",
				metadata: { action: "update", id: params.id, ...body },
			});
		},
		detail: {
			summary: buildRouteSummary("Update an exchange rate"),
		},
	})
	.delete("/rates/:id", async ({ params, status }) => {
		const rate = await deleteRate(params.id);
		if (!rate) return status(404, wrapError("RATE_NOT_FOUND"));

		return { data: rate };
	}, {
		params: t.Object({ id: t.Number() }),
		afterResponse: ({ permission, nickname: initiator, params }) => {
			void createAdminActivityLog({
				event: permission,
				initiator,
				severity: "warning",
				metadata: { action: "delete", id: params.id },
			});
		},
		detail: {
			summary: buildRouteSummary("Delete an exchange rate"),
		},
	});
