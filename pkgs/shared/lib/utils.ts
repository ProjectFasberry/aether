import { createConsola } from "consola";

const logger = createConsola();
const appLogger = logger.withTag("App");

export function showRoutes<T extends { routes: any }>({ routes }: T) {
	for (const { path, method } of routes) {
		appLogger.log(`${path} - ${method}`);
	}

	appLogger.log(`Total ${routes.length} a routes`);
}

export function invariant(predicate: unknown, errorMessage: Error | string = "Assertion Failed"): asserts predicate {
	if (!predicate) {
		throw typeof errorMessage === "string" ? new Error(errorMessage) : errorMessage;
	}
}

export function safeJsonParse<T>(str: string): { ok: true; value: T } | { ok: false; error: Error } {
	try {
		return { ok: true, value: JSON.parse(str) as T };
	} catch (err) {
		return { ok: false, error: err as Error };
	}
}

export function wrapError(e: unknown): { error: string } {
	const error = "Internal Server Error";

	if (typeof e === "object" && e !== null && "message" in e && typeof (e as any).message === "string") {
		try {
			const parsed = JSON.parse((e as any).message);

			if (typeof parsed === "object" && parsed !== null) {
				return { error: parsed };
			}

			return { error: (e as any).message };
		} catch {
			return { error: (e as any).message };
		}
	}

	if (typeof e === "string") {
		try {
			const parsed = JSON.parse(e);

			if (typeof parsed === "object" && parsed !== null) {
				return { error: parsed };
			}

			return { error: e };
		} catch {
			return { error: e };
		}
	}

	logger.error(error);

	return { error };
}
