import { createMinioService } from "@repo/core/lib/minio";
import type { ClientOptions } from "minio";
import { getEnv } from "../env";

const volume = new URL(getEnv().VOLUME_URL);

const config: ClientOptions = {
	endPoint: volume.hostname,
	port: Number(volume.port || (volume.protocol === "https:" ? 443 : 80)),
	useSSL: volume.protocol === "https:",
	accessKey: getEnv().MINIO_ACCESS_KEY,
	secretKey: getEnv().MINIO_SECRET_KEY,
};

export const minioService = createMinioService({
	config,
});
