import type { ClientOptions } from "minio";
import { getEnv } from "../env";

/**
 * The bucket is served by Traefik at VOLUME_URL, while MINIO_HOST/PORT point at
 * the public hostname without TLS. Deriving host/port/ssl from VOLUME_URL keeps
 * one source of truth and works both inside the host network and from outside.
 */
const volume = new URL(getEnv().VOLUME_URL);

export const config: ClientOptions = {
  endPoint: volume.hostname,
  port: Number(volume.port || (volume.protocol === "https:" ? 443 : 80)),
  useSSL: volume.protocol === "https:",
  accessKey: getEnv().MINIO_ACCESS_KEY,
  secretKey: getEnv().MINIO_SECRET_KEY,
};
