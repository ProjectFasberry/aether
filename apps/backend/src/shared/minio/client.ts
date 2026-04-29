import * as Minio from "minio";
import { appLogger, minioLogger } from "#/utils/config/logger";
import { MINIO_ACCESS_KEY, MINIO_HOST, MINIO_PORT, MINIO_SECRET_KEY } from "../env";
import { INTERNAl_FILES, loadInternalFiles } from "#/utils/minio/load-internal-files";
import { invariant } from "#/helpers/invariant";

const config: Minio.ClientOptions = {
	endPoint: MINIO_HOST,
	port: MINIO_PORT,
	useSSL: false,
	accessKey: MINIO_ACCESS_KEY,
	secretKey: MINIO_SECRET_KEY,
};

let instance: Minio.Client | null = null;

export const BUCKETS = {
	SKINS: "skins",
	AVATARS: "avatars",
	STATIC: "static",
	INTERNAL_FILES: "internal-files",
} as const;

const REQUIRED_BUCKETS = Object.values(BUCKETS);

export const minio = {
	get(): Minio.Client {
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
		const client = this.get();

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
		const client = this.get();

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
	async start() {
		appLogger.log(`Starting Minio...`);

		this.init();

		await this._initBuckets();
		await this._printBuckets();

		await loadInternalFiles(INTERNAl_FILES);
	}
}