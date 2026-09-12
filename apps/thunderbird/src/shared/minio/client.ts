export * from "@repo/shared/constants/buckets";

import { getEnv } from "../env";
import { S3Client } from "bun";
import { minioService } from "../services/minio";

const S3ClientsMap = new Map<string, S3Client>()

const creds = {
  endpoint: `http://${getEnv().MINIO_HOST}:${getEnv().MINIO_PORT}`,
  accessKeyId: getEnv().MINIO_ACCESS_KEY,
  secretAccessKey: getEnv().MINIO_SECRET_KEY,
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
