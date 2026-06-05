import { BUCKETS as REQUIRED_BUCKETS } from "@repo/shared/constants/buckets";
import { invariant } from "@repo/shared/lib/utils";
import logger from "consola";
import * as Minio from "minio";

export const createMinioModel = (
  { config }: { config: Minio.ClientOptions, }
) => {
  let instance: Minio.Client | null = null;
  let currentBucketsList: string[] = [];

  return {
    logger: logger.withTag("minio"),
    currentBucketsList,
    getInstance(): Minio.Client {
      invariant(instance, "Minio is not inited");
      return instance;
    },
    _init() {
      try {
        instance = new Minio.Client(config);
        this.logger.success(`Connected to ${config.endPoint}:${config.port}`);
      } catch (e) {
        this.logger.error(`Connection error`, e);
        process.exit(1);
      }
    },
    async _printBuckets() {
      const instance = this.getInstance();

      try {
        const buckets = await instance.listBuckets();
        const lines = buckets
          .map((b) => `${b.name} - ${b.creationDate?.toISOString() ?? "unknown date"}`)
          .join("\n");

        this.logger.box(`Buckets:\n${lines}`);
      } catch (e) {
        this.logger.error(e);
      }
    },
    async _initBuckets() {
      const instance = this.getInstance();
      const bucketsList = Object.values(REQUIRED_BUCKETS);

      await Promise.all(bucketsList.map(async (bucketName) => {
        try {
          const isExists = await instance.bucketExists(bucketName);

          this.currentBucketsList = bucketsList

          if (!isExists) {
            await instance.makeBucket(bucketName, "us-east-1");
            this.currentBucketsList.push(bucketName);
            this.logger.log(`Bucket "${bucketName}" created`);
          } else {
            this.logger.log(`Bucket "${bucketName}" already exists`);
          }
        } catch (e) {
          this.logger.error(`Error ensuring bucket "${bucketName}"`, e);
        }
      }));
    },
    async start({
      onStart, onAfterStart, showBuckets = true
    }: Partial<{
      showBuckets: boolean, onAfterStart: () => Awaitable<void>, onStart: () => void
    }> = {}) {
      onStart?.()

      this._init();

      await this._initBuckets();
      showBuckets && await this._printBuckets();

      await onAfterStart?.()
    },
  }
}
