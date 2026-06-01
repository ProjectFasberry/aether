import { BUCKETS } from "@repo/shared/constants/buckets";
import { invariant } from "@repo/shared/lib/utils";
import logger from "consola";
import * as Minio from "minio";

let instance: Minio.Client | null = null;

const REQUIRED_BUCKETS = Object.values(BUCKETS);

export const createMinioModel = (
  { config }: { config: Minio.ClientOptions, }
) => {
  const minioLogger = logger.withTag("minio");

  return {
    getInstance(): Minio.Client {
      invariant(instance, "Minio is not inited");
      return instance;
    },
    init() {
      try {
        instance = new Minio.Client(config);
        minioLogger.success(`Connected to ${config.endPoint}:${config.port}`);
      } catch (e) {
        minioLogger.error(e);
        process.exit(1);
      }
    },
    async _printBuckets() {
      const client = this.getInstance();

      try {
        const buckets = await client.listBuckets();
        const lines = buckets
          .map((b) => `${b.name} - ${b.creationDate?.toISOString() ?? "unknown date"}`)
          .join("\n");

        minioLogger.box(`Buckets:\n${lines}`);
      } catch (e) {
        minioLogger.error(e);
      }
    },
    async _initBuckets() {
      const client = this.getInstance();

      await Promise.all(
        REQUIRED_BUCKETS.map(async (bucketName) => {
          try {
            const exists = await client.bucketExists(bucketName);

            if (!exists) {
              await client.makeBucket(bucketName, "us-east-1");
              minioLogger.log(`Bucket "${bucketName}" created.`);
            } else {
              minioLogger.log(`Bucket "${bucketName}" already exists.`);
            }
          } catch (e) {
            minioLogger.error(`Error ensuring bucket "${bucketName}":`, e);
          }
        })
      );
    },
    async start(
      { onStart, onAfterStart, showBuckets = true }: Partial<{ showBuckets: boolean, onAfterStart: () => Promise<void>, onStart: () => void }> = {}
    ) {
      onStart?.()

      this.init();

      await this._initBuckets();
      showBuckets && await this._printBuckets();

      await onAfterStart?.()
    },
    logger: minioLogger
  }
}
