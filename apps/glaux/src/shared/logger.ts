import { createConsola } from "consola";

export const logger = createConsola();
export const appLogger = logger.withTag("app");
