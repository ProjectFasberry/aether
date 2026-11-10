import { createMinioConfig, createMinioService } from "@repo/core/lib/minio";
import { getEnv } from "../env";

const config = createMinioConfig({
  volumeUrl: getEnv().VOLUME_URL,
  accessKey: getEnv().MINIO_ACCESS_KEY,
  secretKey: getEnv().MINIO_SECRET_KEY,
});

export const minioService = createMinioService({ config });
