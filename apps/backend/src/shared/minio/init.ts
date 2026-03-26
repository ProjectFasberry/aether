import * as Minio from "minio"
import { logger } from "#/utils/config/logger"
import { MINIO_ACCESS_KEY, MINIO_HOST, MINIO_PORT, MINIO_SECRET_KEY } from "../env"
import { INTERNAl_FILES, loadInternalFiles } from "#/utils/minio/load-internal-files"
import { invariant } from "#/helpers/invariant"

export const minioLogger = logger.withTag("Minio")

const config: Minio.ClientOptions = {
  endPoint: MINIO_HOST,
  port: MINIO_PORT,
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
}

let minio: Minio.Client | null = null;

function initMinio() {
  try {
    minio = new Minio.Client(config)
    minioLogger.success(`Connected to ${config.endPoint}:${config.port}`)
  } catch (e) {
    minioLogger.error(e)
    process.exit(1)
  }
}

export function getMinio(): Minio.Client {
  invariant(minio, "Minio is not inited")
  return minio
}

export const SKINS_BUCKET = "skins"
export const AVATARS_BUCKET = "avatars"
export const STATIC_BUCKET = "static"
export const INTERNAL_FILES_BUCKET = "internal-files"

const BUCKETS = [SKINS_BUCKET, AVATARS_BUCKET]

async function initMinioBuckets() {
  const minio = getMinio();

  for (const target of BUCKETS) {
    const exists = await minio.bucketExists(target)

    if (exists) {
      minioLogger.log('Bucket ' + target + ' exists.')
    } else {
      await minio.makeBucket(target, 'us-east-1')
      minioLogger.log('Bucket ' + target + ' created in "us-east-1".')
    }
  }
}

async function printBuckets() {
  const minio = getMinio();

  try {
    const buckets = await minio.listBuckets()
    const lines = buckets.map(bucket => `${bucket.name} - ${bucket.creationDate}`).join('\n')

    minioLogger.box(`Buckets:
${lines}
    `)
  } catch (e) {
    minioLogger.error(e)
  }
}

export async function startMinio() {
  initMinio();

  await initMinioBuckets();
  await printBuckets();
  await loadInternalFiles(INTERNAl_FILES);
}