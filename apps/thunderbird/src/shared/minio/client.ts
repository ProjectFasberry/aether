export * from "@repo/shared/constants/buckets";

import type { ClientOptions } from "minio";
import { env } from "../env";
import { createMinioService } from "@repo/core/lib/minio/index"
import { S3Client } from "bun";

const config: ClientOptions = {
  endPoint: env.MINIO_HOST,
  port: env.MINIO_PORT,
  useSSL: false,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
};

export const minio = createMinioService({ config })

const S3ClientsMap = new Map<string, S3Client>()

const creds = {
  endpoint: `http://${env.MINIO_HOST}:${env.MINIO_PORT}`,
  accessKeyId: env.MINIO_ACCESS_KEY,
  secretAccessKey: env.MINIO_SECRET_KEY,
}

export const S3 = {
  getClient(bucket: string) {
    if (!minio.currentBucketsList.includes(bucket)) {
      throw new Error(`Bucket ${bucket} is not registered`)
    }

    if (S3ClientsMap.has(bucket)) {
      return S3ClientsMap.get(bucket)!
    }

    const client = new S3Client({
      ...creds,
      bucket,
    })

    S3ClientsMap.set(bucket, client)

    return client
  }
}
