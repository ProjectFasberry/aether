import type { ClientOptions } from "minio";
import { getEnv } from "../env";

/**
 * The bucket is served by Traefik at VOLUME_URL; deriving host/port/ssl from it
 * keeps one source of truth and works both inside the host network and outside.
 */
const volume = new URL(getEnv().VOLUME_URL);

export const config: ClientOptions = {
  endPoint: volume.hostname,
  port: Number(volume.port || (volume.protocol === "https:" ? 443 : 80)),
  useSSL: volume.protocol === "https:",
  accessKey: getEnv().MINIO_ACCESS_KEY,
  secretKey: getEnv().MINIO_SECRET_KEY,
};
