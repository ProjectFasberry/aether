import type { ClientOptions } from "minio";
import { getEnv } from "../env";

export const config: ClientOptions = {
  endPoint: getEnv().MINIO_HOST,
  port: getEnv().MINIO_PORT,
  useSSL: Bun.env.NODE_ENV === 'production',
  accessKey: getEnv().MINIO_ACCESS_KEY,
  secretKey: getEnv().MINIO_SECRET_KEY,
};
