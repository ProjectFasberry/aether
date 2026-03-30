import { isProduction } from "./env";
import { appLogger } from "./logger";

export const poolOptsHooks = (name: string) => {
	if (isProduction) return {};

	const dbLogger = appLogger.withTag("Database").withTag(name);

	return {
		onCreateConnection: async () => {
			dbLogger.info(`New connection established`);
		},
		onDestroyConnection: async () => {
			dbLogger.warn(`Connection destroyed`);
		},
	};
};
