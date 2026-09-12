import { createMinioService } from "@repo/core/lib/minio";
import type { ClientOptions } from "minio";
import { getEnv } from "../env";

const config: ClientOptions = {
	endPoint: getEnv().MINIO_HOST,
	// @ts-expect-error
	port: getEnv().MINIO_PORT,
	useSSL: getEnv().PROD,
	accessKey: getEnv().MINIO_ACCESS_KEY,
	secretKey: getEnv().MINIO_SECRET_KEY,
};

export const minioService = createMinioService({
	config,
});
