import { createMinioService } from "@repo/core/lib/minio";
import type { ClientOptions } from "minio";
import { env } from "../env";

const config: ClientOptions = {
	endPoint: env.MINIO_HOST,
	// @ts-expect-error
	port: env.MINIO_PORT,
	useSSL: false,
	accessKey: env.MINIO_ACCESS_KEY,
	secretKey: env.MINIO_SECRET_KEY,
};

export const minio = createMinioService({
	config,
});
