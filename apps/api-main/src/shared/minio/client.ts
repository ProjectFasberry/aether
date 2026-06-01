export * from "@repo/shared/constants/buckets";

import type { ClientOptions } from "minio";
import { env } from "../env";
import { createMinioModel } from "@repo/core/lib/minio/index"

const config: ClientOptions = {
  endPoint: env.MINIO_HOST,
  port: env.MINIO_PORT,
  useSSL: false,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
};

export const minio = createMinioModel({
  config,
})
