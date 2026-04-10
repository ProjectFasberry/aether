import { isProduction } from "#/shared/env";
import { logger } from "@bogeychan/elysia-logger";
import Elysia from "elysia";

export const loggerPlugin = async () => {
	if (!isProduction) {
		const { logger } = await import("@tqman/nice-logger");
		return new Elysia().use(logger());
	}
	return new Elysia().use(logger());
};
