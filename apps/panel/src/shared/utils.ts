import { appLogger } from "./logger";

export const dbPoolHooks = (name: string) => {
	return {
		onCreateConnection: async () => {
			appLogger.withTag(`DB:${name}`).info(`New connection established`);
		},
		onDestroyConnection: async () => {
			appLogger.withTag(`DB:${name}`).warn(`Connection destroyed`);
		},
	};
};
