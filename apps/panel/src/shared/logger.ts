import { createConsola } from "consola";

export const logger = createConsola();
export const appLogger = logger.withTag("App");
export const botLogger = logger.withTag("Bot");
export const natsLogger = logger.withTag("Nats");
export const redisLogger = logger.withTag("Redis");
