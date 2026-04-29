import { createConsola } from "consola";

export const logger = createConsola()
export const appLogger = logger.withTag("App")
export const natsLogger = logger.withTag("Nats")
export const redisLogger = logger.withTag("Redis");
export const minioLogger = logger.withTag("Minio");
export const rconLogger = logger.withTag("Rcon");
