import { createMinioService } from "@repo/core/lib/minio";
import { config } from "../minio/config";

export const minioService = createMinioService({
  config
})
