import { BUCKETS as REQUIRED_BUCKETS } from "@repo/shared/constants/buckets";
import { invariant } from "@repo/shared/lib/utils";
import * as Minio from "minio";
import { logger } from "@repo/shared/utils/logger";

type CreateMinioSharedParams = {
  onSuccess?: () => void;
  onError?: (e: unknown) => void;
};

let instance: Minio.Client | null = null;
let currentBucketsList: string[] = [];

export const createMinioService = (
  { config }: { config: Minio.ClientOptions, }
) => {
  return {
    logger: logger.child({ name: "minio" }),
    currentBucketsList,
    getInstance(): Minio.Client {
      invariant(instance, "Minio is not inited");
      return instance;
    },
    _init() {
      try {
        instance = new Minio.Client(config);
        return instance;
      } catch (e) {
        process.exit(1);
      }
    },
    async _printBuckets({ onError }: Pick<CreateMinioSharedParams, "onError"> = {}) {
      const instance = this.getInstance();

      try {
        const buckets = await instance.listBuckets();

        const lines = buckets
          .map((b) => `${b.name} - ${b.creationDate?.toISOString() ?? "unknown date"}`)
          .join("\n");

        logger.info(lines, { asBox: true, title: "Buckets" })
      } catch (e) {
        if (onError) {
          onError(e);
        } else {
          throw e
        }
      }
    },
    async _initBuckets(): Promise<void> {
      const instance = this.getInstance();
      const bucketsList = Object.values(REQUIRED_BUCKETS);

      this.currentBucketsList = bucketsList

      await Promise.all(bucketsList.map(async (bucketName) => {
        try {
          const isExists = await instance.bucketExists(bucketName);

          if (!isExists) {
            await instance.makeBucket(bucketName, "us-east-1");
            this.currentBucketsList.push(bucketName);
            this.logger.info(`Bucket "${bucketName}" created`);
          } else {
            this.logger.info(`Bucket "${bucketName}" already exists`);
          }
        } catch (e) {
          this.logger.error(`Error ensuring bucket "${bucketName}"`, e);
        }
      }));
    },
    async start({
      onStart, onAfterStart, showBuckets = true
    }: Partial<{
      showBuckets: boolean, onAfterStart: (client: Minio.Client) => Awaitable<void>, onStart: () => void
    }> = {}) {
      onStart?.()

      const client = this._init();

      await this._initBuckets();

      if (showBuckets) {
        await this._printBuckets();
      }

      await onAfterStart?.(client)
    },
  }
}
