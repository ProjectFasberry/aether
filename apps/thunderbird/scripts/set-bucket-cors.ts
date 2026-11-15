/**
 * Sets a permissive read CORS rule on a bucket through the S3 API.
 *
 * RustFS does not expose CORS in the MinIO JS client, so the request is signed
 * by hand. Run inside the API container (host network):
 *
 *   infisical run --env=prod --path=/thunderbird -- \
 *     bun run scripts/set-bucket-cors.ts skins avatars
 */
import { createHash, createHmac } from "node:crypto"

const endpoint = new URL(Bun.env["S3_ENDPOINT"] ?? "http://127.0.0.1:9000")
const region = Bun.env["S3_REGION"] ?? "auto"
const service = "s3"
const accessKey = Bun.env["MINIO_ACCESS_KEY"]
const secretKey = Bun.env["MINIO_SECRET_KEY"]

if (!accessKey || !secretKey) throw new Error("MINIO_ACCESS_KEY/MINIO_SECRET_KEY are required")

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex")
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest()

const corsXml = `<CORSConfiguration>
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`

async function putCors(bucket: string) {
	const body = corsXml
	const payloadHash = sha256(body)
	const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "")
	const dateStamp = amzDate.slice(0, 8)
	const host = endpoint.host

	const canonicalRequest = [
		"PUT",
		`/${bucket}`,
		"cors=",
		`host:${host}`,
		`x-amz-content-sha256:${payloadHash}`,
		`x-amz-date:${amzDate}`,
		"",
		"host;x-amz-content-sha256;x-amz-date",
		payloadHash,
	].join("\n")

	const scope = `${dateStamp}/${region}/${service}/aws4_request`
	const stringToSign = [
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		sha256(canonicalRequest),
	].join("\n")

	const signingKey = hmac(
		hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), service),
		"aws4_request",
	)
	const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex")

	const response = await fetch(`${endpoint.origin}/${bucket}?cors`, {
		method: "PUT",
		headers: {
			"content-type": "application/xml",
			"x-amz-content-sha256": payloadHash,
			"x-amz-date": amzDate,
			authorization:
				`AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
				`SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`,
		},
		body,
	})

	if (!response.ok) {
		throw new Error(`${bucket}: HTTP ${response.status} ${await response.text()}`)
	}

	console.log(`${bucket}: CORS set`)
}

for (const bucket of Bun.argv.slice(2)) {
	await putCors(bucket)
}
