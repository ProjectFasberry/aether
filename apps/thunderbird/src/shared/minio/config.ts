import type { ClientOptions } from "minio";
import { env } from "../env";

export const config: ClientOptions = {
  endPoint: env.MINIO_HOST,
  port: env.MINIO_PORT,
  useSSL: false,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
};
