/**
 * Moves uploaded skins from `textures.minecraft.net` to the local `skins`
 * bucket and re-signs every texture value with the Yggdrasil key.
 *
 * Self-contained on purpose: run it inside the API container, which already has
 * the prod env, `mariadb` and the signing key, without the source tree:
 *
 *   docker cp backfill-skin-textures.ts prod-app-thunderbird:/tmp/
 *   docker exec prod-app-thunderbird bun /tmp/backfill-skin-textures.ts --apply
 *
 * Dry run by default; `--apply` writes. Re-runs skip rows already on our host.
 */
import { createHash, createPrivateKey, sign } from "node:crypto"
import { SQL } from "bun"
import { createPool } from "mariadb"

const APPLY = Bun.argv.includes("--apply")
const LIMIT = Number(Bun.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? "0")

const env = (name: string) => {
	const value = Bun.env[name]
	if (!value) throw new Error(`${name} is required`)

	return value
}

const volumeUrl = env("VOLUME_URL").replace(/\/+$/, "")
const bucket = "skins"
const prefix = `${volumeUrl}/${bucket}/`

const general = new SQL(env("GENERAL_POSTGRES_URI"))
const [keyRow] = await general`select private_key from signing_keys where active = true order by id desc limit 1`
if (!keyRow?.private_key) throw new Error("No active Yggdrasil signing key")

const privateKey = createPrivateKey(String(keyRow.private_key))

const skinsUri = new URL(env("SKINS_MYSQL_URI"))
const pool = createPool({
	host: skinsUri.hostname,
	port: Number(skinsUri.port || 3306),
	user: decodeURIComponent(skinsUri.username),
	password: decodeURIComponent(skinsUri.password),
	database: skinsUri.pathname.replace(/^\//, ""),
	connectionLimit: 4,
})

const s3 = new Bun.S3Client({
	endpoint: volumeUrl,
	accessKeyId: env("MINIO_ACCESS_KEY"),
	secretAccessKey: env("MINIO_SECRET_KEY"),
	bucket,
})

/** Deterministic value: the same texture always produces the same signature. */
function signValue(textureUrl: string, variant: string | null) {
	const textures = {
		SKIN: {
			url: textureUrl,
			...(variant?.toUpperCase() === "SLIM" ? { metadata: { model: "slim" } } : {}),
		},
	}

	const payload = { timestamp: 0, textures }
	const value = Buffer.from(JSON.stringify(payload)).toString("base64")
	const signature = sign("sha1", Buffer.from(value), privateKey).toString("base64")

	return { value, signature }
}

async function download(textureUrl: string): Promise<Uint8Array> {
	const response = await fetch(textureUrl, {
		redirect: "follow",
		signal: AbortSignal.timeout(20_000),
	})

	if (!response.ok) throw new Error(`HTTP ${response.status}`)

	return new Uint8Array(await response.arrayBuffer())
}

const rows = await pool.query(
	`select url, signature, skin_variant from sr_url_skins order by url${LIMIT > 0 ? ` limit ${LIMIT}` : ""}`,
)

let migrated = 0
let skipped = 0
let failed = 0
const byHash = new Map<string, { url: string, value: string, signature: string }>()

for (const row of rows) {
	const oldUrl = String(row.url)

	if (oldUrl.startsWith(prefix)) {
		skipped++
		continue
	}

	try {
		const bytes = await download(oldUrl)
		const hash = createHash("sha256").update(bytes).digest("hex")
		const key = `textures/${hash}.png`
		const newUrl = `${prefix}${key}`

		let signed = byHash.get(hash)
		if (!signed) {
			signed = { url: newUrl, ...signValue(newUrl, row.skin_variant ? String(row.skin_variant) : null) }
			byHash.set(hash, signed)

			if (APPLY) await s3.write(key, bytes, { type: "image/png" })
		}

		if (APPLY) {
			const connection = await pool.getConnection()

			try {
				await connection.beginTransaction()

				const existing = await connection.query(
					"select url from sr_url_skins where url = ?",
					[signed.url],
				)

				if (existing.length > 0) {
					// The same texture is already migrated: drop the duplicate row.
					await connection.query("delete from sr_url_skins where url = ?", [oldUrl])
				} else {
					await connection.query(
						"update sr_url_skins set url = ?, value = ?, signature = ?, mine_skin_id = ? where url = ?",
						[signed.url, signed.value, signed.signature, key, oldUrl],
					)
				}

				await connection.query(
					"update sr_custom_skins set value = ?, signature = ? where signature = ?",
					[signed.value, signed.signature, row.signature],
				)

				await connection.commit()
			} catch (error) {
				await connection.rollback()
				throw error
			} finally {
				connection.release()
			}
		}

		migrated++
		if (migrated % 25 === 0) console.log(`migrated ${migrated}`)
	} catch (error) {
		failed++
		console.error(`failed ${oldUrl}:`, error instanceof Error ? error.message : error)
	}
}

console.log(JSON.stringify({ apply: APPLY, total: rows.length, migrated, skipped, failed }))

await pool.end()
await general.close()
