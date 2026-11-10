import { createMinioConfig } from "@repo/core/lib/minio";
import { getEnv } from "../env";

/**
 * The bucket is served by Traefik at VOLUME_URL; deriving host/port/ssl from it
 * keeps one source of truth and works both inside the host network and outside.
 */
export const config = createMinioConfig({
  volumeUrl: getEnv().VOLUME_URL,
  accessKey: getEnv().MINIO_ACCESS_KEY,
  secretKey: getEnv().MINIO_SECRET_KEY,
});
