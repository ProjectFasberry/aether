import { clientInstance, panelClientInstance } from "@/shared/api/client";
import { type KyInstance, type Options } from "ky";

type FetchContext = { path: string; options?: Options };
type FetchPipe = (ctx: FetchContext) => FetchContext;

type ApiPipeline<T> = {
	pipe: (...fns: FetchPipe[]) => ApiPipeline<T>;
	exec: () => Promise<T>;
};

type ClientFetch = {
	<T = unknown>(path: string, options?: Options): ApiPipeline<T>;
} & {
	[K in "get" | "post" | "put" | "patch" | "delete"]: <T = unknown>(
		path: string,
		options?: Options
	) => ApiPipeline<T>;
};

const isErrorRes = (v: unknown): v is { error: string } =>
	typeof v === "object" && v !== null && "error" in v && typeof (v as any).error === "string";

export async function parseWrappedJson<T>(res: Response): Promise<T> {
	const json = await res.json();
	if (isErrorRes(json)) throw new Error(json.error);
	if (json && typeof json === "object" && "data" in json) return (json as any).data;
	throw new Error("Malformed response");
}

const createPipeline = <T>(
	ky: KyInstance,
	path: string,
	options: Options = {},
	pipes: FetchPipe[] = []
): ApiPipeline<T> => ({
	pipe: (...fns) => createPipeline(ky, path, options, [...pipes, ...fns]),
	exec: async () => {
		const ctx = pipes.reduce<FetchContext>(
			(acc, fn) => fn(acc),
			{ path, options }
		);

		if (typeof window === "undefined" && ctx.options?.headers) {
			const h = ctx.options.headers;
			if (h instanceof Headers) h.delete("host");
			else delete (h as Record<string, any>)["host"];
		}

		const res = await ky(ctx.path, ctx.options);
		return parseWrappedJson<T>(res);
	},
});
export function createApiInstance(ky: KyInstance): ClientFetch {
	const base = <T>(path: string, options?: Options) => createPipeline<T>(ky, path, options);
	const methods = ["get", "post", "put", "patch", "delete"] as const;

	methods.forEach((m) => {
		(base as any)[m] = <T>(path: string, options?: Options) =>
			createPipeline<T>(ky, path, { ...options, method: m.toUpperCase() });
	});

	return base as ClientFetch;
}

export const withHeaders = (headers: HeadersInit): FetchPipe => (ctx) => ({
	...ctx,
	options: { ...ctx.options, headers: { ...ctx.options?.headers, ...headers } },
});
export const withJsonBody = (body: unknown): FetchPipe => (ctx) => ({
	...ctx,
	options: {
		...ctx.options,
		json: body,
		headers: { ...ctx.options?.headers, "Content-Type": "application/json" }
	},
});
export const withQueryParams = (params: Record<string, any>): FetchPipe => (ctx) => {
	const validParams = Object.entries(params).filter(([_, v]) => v != null);
	if (validParams.length === 0) return ctx;

	const url = new URL(ctx.path, "http://a");
	validParams.forEach(([k, v]) => {
		url.searchParams.append(k, String(v))
	});

	return {
		...ctx,
		path: ctx.path.includes("?")
			? `${ctx.path.split("?")[0]}?${url.searchParams.toString()}`
			: `${ctx.path}?${url.searchParams.toString()}`
	};
};

export const panelClient = createApiInstance(panelClientInstance);
export const client = createApiInstance(clientInstance);