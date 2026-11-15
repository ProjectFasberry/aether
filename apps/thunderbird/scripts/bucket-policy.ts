/**
 * Reads or sets the public-read policy of a volume bucket.
 *
 *   infisical run --env=prod --path=/thunderbird -- \
 *     bun run scripts/bucket-policy.ts <bucket> [get|public]
 */
import * as Minio from "minio"

const volume = new URL(process.env.VOLUME_URL ?? "")
const client = new Minio.Client({
	endPoint: volume.hostname,
	port: Number(volume.port || (volume.protocol === "https:" ? 443 : 80)),
	useSSL: volume.protocol === "https:",
	accessKey: process.env.MINIO_ACCESS_KEY ?? "",
	secretKey: process.env.MINIO_SECRET_KEY ?? "",
})

const bucket = process.argv[2]
const action = process.argv[3] ?? "get"

if (!bucket) throw new Error("usage: bucket-policy.ts <bucket> [get|public]")

if (action === "get") {
	const policy = await client.getBucketPolicy(bucket).catch((error) => {
		console.log(`no policy: ${error instanceof Error ? error.message : error}`)
		return null
	})

	if (policy) console.log(policy)
} else {
	const policy = JSON.stringify({
		Version: "2012-10-17",
		Statement: [
			{
				Effect: "Allow",
				Principal: { AWS: ["*"] },
				Action: ["s3:GetObject"],
				Resource: [`arn:aws:s3:::${bucket}/*`],
			},
		],
	})

	await client.setBucketPolicy(bucket, policy)
	console.log(`public read enabled for ${bucket}`)
}
