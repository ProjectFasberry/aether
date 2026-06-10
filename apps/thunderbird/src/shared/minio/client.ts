export * from "@repo/shared/constants/buckets";

import { env } from "../env";
import { S3Client } from "bun";
import { minioService } from "../services/minio";

const S3ClientsMap = new Map<string, S3Client>()

const creds = {
  endpoint: `http://${env.MINIO_HOST}:${env.MINIO_PORT}`,
  accessKeyId: env.MINIO_ACCESS_KEY,
  secretAccessKey: env.MINIO_SECRET_KEY,
}

export const S3 = {
  getClient(bucket: string): S3Client {
    if (!minioService.currentBucketsList.includes(bucket)) {
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
