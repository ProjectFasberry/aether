import Elysia, { t, type Context } from "elysia";
import { defineRequiredUser } from "#/lib/define";
import { validatePermission } from "#/lib/validators";
import { createAdminActivityLog } from "#/modules/private/private.model";
import { enqueueGrantJob } from "#/modules/economy/grant-jobs.model";
import { buildRouteSummary } from "#/lib/routes";
import { wrapError } from "@repo/shared/lib/helpers";
import {
	PaymentError,
	createPaymentInvoice,
	getOrder,
	listOrders,
	recordPaymentEvent,
	refundPayment,
	settleOrder,
} from "./orders.model";
import { PROVIDER_NAMES } from "./types";
import { getProvider, listProviders } from "./providers";

const invoiceSchema = t.Object({
	provider: t.UnionEnum(PROVIDER_NAMES),
	amountMinor: t.Integer({ minimum: 1, maximum: 100_000_000_000 }),
	currency: t.UnionEnum(["RUB", "USDT", "USDC"]),
});

/** Behind Traefik the internal request URL is localhost; use the forwarded host. */
function publicOrigin(request: Request): string {
	const proto = request.headers.get("x-forwarded-proto") ?? "https";
	const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

	return host ? `${proto}://${host}` : new URL(request.url).origin;
}

function page(title: string, body: string): string {
	return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#0a0a0a;color:#f5f5f5;display:grid;place-items:center;min-height:100vh}
  main{background:#171717;border:1px solid #2a2a2a;border-radius:16px;padding:24px;max-width:420px;width:calc(100% - 32px)}
  h1{font-size:20px;margin:0 0 12px}
  p{margin:6px 0;color:#a3a3a3}
  b{color:#f5f5f5}
  form{display:inline-block;margin:12px 8px 0 0}
  button{font:inherit;padding:8px 16px;border-radius:10px;border:0;cursor:pointer}
  .pay{background:#f5f5f5;color:#0a0a0a}
  .cancel{background:#262626;color:#f5f5f5}
</style></head><body><main>${body}</main></body></html>`;
}

const fakeCheckout = new Elysia()
	.use(validatePermission("economy.write"))
	.get("/fake/:orderId", async ({ params, set, status }) => {
		const order = await getOrder(params.orderId);

		if (!order || order.provider !== "fake") return status(404, wrapError("ORDER_NOT_FOUND"));

		set.headers["content-type"] = "text/html; charset=utf-8";

		if (order.status !== "pending") {
			return page("Тестовый платёж", `<h1>Заказ ${order.order_id}</h1><p>Статус: <b>${order.status}</b></p>`);
		}

		return page(
			"Тестовый платёж",
			`<h1>Тестовый платёж</h1>
			<p>Игрок: <b>${order.nickname}</b></p>
			<p>Сумма: <b>${order.amount_minor} ${order.currency} (minor)</b></p>
			<p>К начислению: <b>${order.belkoin} BELKOIN</b></p>
			<form method="post" action="/payments/fake/${order.order_id}/pay">
				<button class="pay" type="submit">Оплатить</button>
			</form>
			<form method="post" action="/payments/fake/${order.order_id}/cancel">
				<button class="cancel" type="submit">Отменить</button>
			</form>`,
		);
	})
	.post("/fake/:orderId/pay", async ({ params, status }) => {
		const order = await getOrder(params.orderId);
		if (!order || order.provider !== "fake") return status(404, wrapError("ORDER_NOT_FOUND"));

		const result = await settleOrder({
			provider: "fake",
			orderId: order.order_id,
			providerPaymentId: `fake:${order.order_id}`,
			status: "succeeded",
			amountMinor: Number(order.amount_minor),
			currency: order.currency,
		});

		return { data: result };
	}, {
		afterResponse: ({ nickname: initiator, params }) => {
			void createAdminActivityLog({
				event: "payment.fake.succeeded",
				initiator,
				severity: "warning",
				metadata: { orderId: params.orderId },
			});
		},
	})
	.post("/fake/:orderId/cancel", async ({ params, status }) => {
		const order = await getOrder(params.orderId);
		if (!order || order.provider !== "fake") return status(404, wrapError("ORDER_NOT_FOUND"));

		const result = await settleOrder({
			provider: "fake",
			orderId: order.order_id,
			providerPaymentId: `fake:${order.order_id}`,
			status: "failed",
		});

		return { data: result };
	});

const invoices = new Elysia()
	.use(defineRequiredUser())
	.get("/providers", () => ({ data: listProviders() }), {
		detail: { summary: buildRouteSummary("List payment providers") },
	})
	.post("/invoice", async ({ body, nickname, request, status }) => {
		try {
			const order = await createPaymentInvoice({
				nickname,
				providerName: body.provider,
				amountMinor: body.amountMinor,
				currency: body.currency,
				origin: publicOrigin(request),
			});

			return { data: order };
		} catch (error) {
			if (error instanceof PaymentError) return status(400, wrapError(error.code));

			throw error;
		}
	}, {
		body: invoiceSchema,
		detail: { summary: buildRouteSummary("Create a payment invoice") },
	})
	.get("/orders", async ({ nickname }) => {
		const data = await listOrders(nickname);
		return { data };
	}, {
		detail: { summary: buildRouteSummary("List my payment orders") },
	});

const refunds = new Elysia()
	.use(validatePermission("economy.write"))
	.post("/orders/:orderId/refund", async ({ params, nickname, body, status }) => {
		try {
			const result = await refundPayment({
				orderId: params.orderId,
				actor: nickname,
				adminReason: body.reason,
			});

			if (!result) return status(404, wrapError("ORDER_NOT_FOUND"));

			return { data: result };
		} catch (error) {
			if (error instanceof Error && error.message === "INSUFFICIENT_FUNDS") {
				return status(400, wrapError("INSUFFICIENT_FUNDS"));
			}

			if (error instanceof Error && error.message === "NOTHING_TO_REFUND") {
				return status(400, wrapError("NOTHING_TO_REFUND"));
			}

			throw error;
		}
	}, {
		body: t.Object({ reason: t.String({ minLength: 3, maxLength: 200 }) }),
		afterResponse: ({ permission, nickname: initiator, params, body }) => {
			void createAdminActivityLog({
				event: permission,
				initiator,
				severity: "warning",
				metadata: { orderId: params.orderId, adminReason: body.reason },
			});
		},
		detail: { summary: buildRouteSummary("Refund a payment") },
	});

export const paymentWebhook = new Elysia()
	.post("/webhook/:provider", async (ctx) => {
		const { params, status } = ctx;
		const provider = getProvider(params.provider);

		if (!provider || !provider.isConfigured()) return status(404, wrapError("PROVIDER_NOT_FOUND"));

		let event;

		try {
			event = await provider.verifyWebhook(ctx as Context);
		} catch (error) {
			await recordPaymentEvent({
				provider: provider.name,
				signatureValid: false,
				payload: ctx.body,
				error: error instanceof Error ? error.message : String(error),
			});

			return status(400, wrapError("WEBHOOK_FAILED"));
		}

		if (!event) {
			await recordPaymentEvent({
				provider: provider.name,
				signatureValid: false,
				payload: ctx.body,
				error: "INVALID_SIGNATURE",
			});

			return status(401, wrapError("INVALID_SIGNATURE"));
		}

		await recordPaymentEvent({
			provider: provider.name,
			eventId: event.eventId,
			orderId: event.orderId,
			signatureValid: true,
			payload: ctx.body,
		});

		try {
			const order = await settleOrder({
				provider: provider.name,
				orderId: event.orderId,
				providerPaymentId: event.providerPaymentId,
				status: event.status,
				amountMinor: event.amountMinor,
				currency: event.currency,
			});

			if (!order) return status(404, wrapError("ORDER_NOT_FOUND"));

			return { data: { status: order.status } };
		} catch (error) {
			// A transient database failure must not lose a paid invoice: retry
			// through the outbox and let the provider retry as well.
			await enqueueGrantJob({
				orderId: event.orderId,
				kind: "payment.settle",
				payload: {
					provider: provider.name,
					orderId: event.orderId,
					providerPaymentId: event.providerPaymentId,
					status: event.status,
					amountMinor: event.amountMinor,
					currency: event.currency,
				},
			});

			throw error;
		}
	}, {
		detail: { summary: buildRouteSummary("Payment provider webhook") },
	});

export const payments = new Elysia()
	.group("/payments", (app) => app
		.use(invoices)
		.use(refunds)
		.use(fakeCheckout)
		.use(paymentWebhook)
	);
