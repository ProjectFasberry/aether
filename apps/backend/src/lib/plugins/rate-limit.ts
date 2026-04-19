import Elysia from "elysia";
import { rateLimit, type Options } from "elysia-rate-limit";
import type { Server } from "bun";
import type { MaybePromise } from "elysia";

export type Generator<T extends object = {}> = (
	request: Request,
	server: Server | null,
	derived: T,
) => MaybePromise<string>;

export class RateLimitError extends Error {
	constructor(
		public message: string = "rate-limited",
		public detail: string = "",
		public status: number = 429,
	) {
		super(message);
	}
}

let server: Server | null;

const LIMIT_PER_MINUTE = 300;

const keyGenerator: Generator<{ ip: string }> = async (req, server, { ip }) => Bun.hash(JSON.stringify(ip)).toString();

const rateLimitError = new RateLimitError();

const errorBody = {
	error: rateLimitError.message,
	detail: rateLimitError.detail,
};

const errorResponse = new Response(JSON.stringify(errorBody), {
	status: rateLimitError.status,
	headers: {
		"Content-Type": "application/json",
	},
});

const rateLimitConfig: Partial<Options> = {
	errorResponse,
	max: LIMIT_PER_MINUTE,
	injectServer: () => server!,
	generator: keyGenerator,
};

export const rateLimitPlugin = () => new Elysia().use(rateLimit(rateLimitConfig));
