import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { general } from "#/shared/database/general-db";
import { BUCKETS, S3 } from "#/shared/minio/client";
import { getStaticUrl } from "#/helpers/volume";
import { natsService } from "#/shared/nats/client";
import { SUBJECTS } from "@repo/shared/constants/subjects";
import {
	CONTENT_PREFIX,
	invalidateContentManifest,
	MANIFEST_KEY,
	PACK_MANIFEST_PATH,
	readContentManifest,
	upsertManifestEntry,
} from "./manifest.model";

/**
 * Versioned server resource pack.
 *
 * Uploads are immutable: every archive is stored once under its sha256, while
 * the published version is copied to the canonical path the launcher manifest
 * points at. Publishing is therefore a pointer flip plus a manifest rewrite,
 * and rollback is the same operation on an older row.
 */

/** File name the launcher installs and the catalog references. */
export const PACK_FILE_NAME = "generated.zip";
/** Canonical object read by the launcher (path from the manifest). */
export const PACK_CANONICAL_KEY = `${CONTENT_PREFIX}${PACK_MANIFEST_PATH}`;
/**
 * Public key ItemsAdder's `external-host` and older configs point at. Publishing
 * refreshes it together with the manifest path so both stay one pack.
 */
export const PACK_PUBLIC_KEY = `${CONTENT_PREFIX}${PACK_FILE_NAME}`;
/** Manifest path (`resourcepacks/<name>`). */
export const PACK_MANIFEST_ENTRY = PACK_MANIFEST_PATH;
/** Immutable per-version objects. */
export const PACK_VERSION_PREFIX = `${CONTENT_PREFIX}packs/`;

/** More than the current pack needs, low enough to stay a single request. */
export const MAX_PACK_BYTES = 100 * 1024 * 1024;
export const MAX_PACK_MB = MAX_PACK_BYTES / 1024 / 1024;

/** Every version the launcher knows, used as the default publish target. */
export const DEFAULT_PACK_VERSIONS = ["1.20.1", "1.20.4"];

export type ResourcePackRow = {
	id: number;
	sha1: string;
	sha256: string;
	size: string | number;
	object_key: string;
	minecraft: string[];
	pack_format: number | null;
	notes: string | null;
	uploaded_by: string | null;
	created_at: string | Date;
	is_current: boolean;
};

export type ResourcePackPayload = {
	id: number;
	sha1: string;
	sha256: string;
	size: number;
	url: string;
	stable_url: string;
	minecraft: string[];
	pack_format: number | null;
	notes: string | null;
	uploaded_by: string | null;
	created_at: string;
	is_current: boolean;
};

export type PackUploadInput = {
	file: Blob;
	uploadedBy: string;
	minecraft: string[];
	notes?: string | null;
};

export type PackUploadResult = {
	pack: ResourcePackPayload;
	warnings: string[];
};

const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
const sha1 = (data: Uint8Array) => createHash("sha1").update(data).digest("hex");

function versionedKey(digest: string): string {
	return `${PACK_VERSION_PREFIX}${digest}.zip`;
}

function objectUrl(key: string): string {
	return getStaticUrl(key);
}

function toPayload(row: ResourcePackRow): ResourcePackPayload {
	return {
		id: row.id,
		sha1: row.sha1,
		sha256: row.sha256,
		size: Number(row.size),
		url: objectUrl(row.object_key),
		stable_url: objectUrl(PACK_PUBLIC_KEY),
		minecraft: row.minecraft ?? [],
		pack_format: row.pack_format,
		notes: row.notes,
		uploaded_by: row.uploaded_by,
		created_at: new Date(row.created_at).toISOString(),
		is_current: row.is_current,
	};
}

export async function listResourcePacks(): Promise<ResourcePackPayload[]> {
	const rows = (await general
		.selectFrom("resource_packs")
		.selectAll()
		.orderBy("id", "desc")
		.execute()) as unknown as ResourcePackRow[];

	return rows.map(toPayload);
}

export async function getResourcePack(id: number): Promise<ResourcePackRow | null> {
	const row = await general
		.selectFrom("resource_packs")
		.selectAll()
		.where("id", "=", id)
		.executeTakeFirst();

	return (row as unknown as ResourcePackRow | undefined) ?? null;
}

export async function getCurrentResourcePack(): Promise<ResourcePackPayload | null> {
	const row = await getCurrentRow();

	return row ? toPayload(row) : null;
}

async function getCurrentRow(): Promise<ResourcePackRow | null> {
	const row = await general
		.selectFrom("resource_packs")
		.selectAll()
		.where("is_current", "=", true)
		.executeTakeFirst();

	return (row as unknown as ResourcePackRow | undefined) ?? null;
}

/**
 * Minimal ZIP reader: enough to confirm the upload is a pack and to read
 * `pack.mcmeta`. Uses the central directory, so a broken archive is rejected
 * before it reaches the bucket.
 */
export function readPackMeta(data: Uint8Array): { packFormat: number | null; entries: number } {
	if (data.byteLength < 22) throw new Error("not a zip archive");

	const end = findEndOfCentralDirectory(data);
	if (!end) throw new Error("not a zip archive");

	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const entries = view.getUint16(end + 10, true);
	const directoryOffset = view.getUint32(end + 16, true);

	let offset = directoryOffset;
	let packFormat: number | null = null;
	let foundMeta = false;
	let seen = 0;

	while (offset + 46 <= data.byteLength && seen < entries) {
		if (view.getUint32(offset, true) !== 0x02014b50) break;

		const method = view.getUint16(offset + 10, true);
		const compressedSize = view.getUint32(offset + 20, true);
		const nameLength = view.getUint16(offset + 28, true);
		const extraLength = view.getUint16(offset + 30, true);
		const commentLength = view.getUint16(offset + 32, true);
		const localOffset = view.getUint32(offset + 42, true);
		const name = new TextDecoder().decode(data.subarray(offset + 46, offset + 46 + nameLength));

		if (name === "pack.mcmeta") {
			if (compressedSize === 0xffffffff || localOffset === 0xffffffff) {
				throw new Error("zip64 archives are not supported");
			}

			const localNameLength = view.getUint16(localOffset + 26, true);
			const localExtraLength = view.getUint16(localOffset + 28, true);
			const start = localOffset + 30 + localNameLength + localExtraLength;
			const raw = data.subarray(start, start + compressedSize);
			const body = method === 0 ? raw : inflateRawSync(raw);

			const parsed = JSON.parse(new TextDecoder().decode(body)) as { pack?: { pack_format?: unknown } };
			const format = parsed.pack?.pack_format;
			packFormat = typeof format === "number" ? format : null;
			foundMeta = true;
		}

		offset += 46 + nameLength + extraLength + commentLength;
		seen += 1;
	}

	if (seen === 0) throw new Error("empty zip archive");
	if (!foundMeta) throw new Error("pack.mcmeta is missing");

	return { packFormat, entries: seen };
}

function findEndOfCentralDirectory(data: Uint8Array): number | null {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	const stop = Math.max(0, data.byteLength - 22 - 0xffff);
	const start = data.byteLength - 22;

	for (let offset = start; offset >= stop; offset -= 1) {
		if (view.getUint32(offset, true) === 0x06054b50) return offset;
	}

	return null;
}

/** Pack formats per client version; a mismatch is a warning, not a block. */
const PACK_FORMATS: Record<string, number> = {
	"1.20.1": 15,
	"1.20.4": 22,
};

/**
 * Stores an archive as a new version. Publishing is a separate step: a bad
 * upload must not replace the pack players are currently receiving.
 */
export async function uploadResourcePack(input: PackUploadInput): Promise<PackUploadResult> {
	const data = new Uint8Array(await input.file.arrayBuffer());
	const { row, warnings } = await storeArchive(data, {
		uploadedBy: input.uploadedBy,
		minecraft: input.minecraft,
		notes: input.notes,
		reuseExisting: false,
	});

	return { pack: toPayload(row), warnings };
}

/**
 * Registers the live pack that ItemsAdder used to upload by hand. Reads the
 * public key first (that is the file `/iazip` produced) and falls back to the
 * manifest path; safe to repeat because the same SHA-256 maps to the same row.
 */
export async function adoptCurrentPack(uploadedBy: string): Promise<PackUploadResult> {
	const client = S3.getClient(BUCKETS.STATIC);
	const publicFile = client.file(PACK_PUBLIC_KEY);
	const source = (await publicFile.exists()) ? publicFile : client.file(PACK_CANONICAL_KEY);

	if (!(await source.exists())) throw new Error("the canonical pack object is missing");

	const data = new Uint8Array(await source.arrayBuffer());
	const { row, warnings } = await storeArchive(data, {
		uploadedBy,
		minecraft: DEFAULT_PACK_VERSIONS,
		notes: "adopted from the canonical path",
		reuseExisting: true,
	});

	return { pack: toPayload(row), warnings };
}

async function storeArchive(
	data: Uint8Array,
	input: Omit<PackUploadInput, "file"> & { reuseExisting: boolean },
): Promise<{ row: ResourcePackRow; warnings: string[] }> {
	if (data.byteLength === 0) throw new Error("empty upload");
	if (data.byteLength > MAX_PACK_BYTES) throw new Error(`pack is larger than ${MAX_PACK_MB} MB`);

	const { packFormat } = readPackMeta(data);
	const digest256 = sha256(data);
	const digest1 = sha1(data);
	const key = versionedKey(digest256);
	const minecraft = [...new Set(input.minecraft.map((version) => version.trim()).filter(Boolean))];

	const existing = await general
		.selectFrom("resource_packs")
		.selectAll()
		.where("sha256", "=", digest256)
		.executeTakeFirst();

	if (existing) {
		if (!input.reuseExisting) throw new Error("this pack is already uploaded");

		return {
			row: existing as unknown as ResourcePackRow,
			warnings: packWarnings((existing as unknown as ResourcePackRow).pack_format, minecraft),
		};
	}

	await S3.getClient(BUCKETS.STATIC).write(key, data, { type: "application/zip" });

	const inserted = await general
		.insertInto("resource_packs")
		.values({
			sha1: digest1,
			sha256: digest256,
			size: data.byteLength,
			object_key: key,
			// pg sends plain arrays as Postgres array literals, not JSON; the
			// column is jsonb, so the value is serialised explicitly.
			minecraft: JSON.stringify(minecraft),
			pack_format: packFormat,
			notes: input.notes?.trim() || null,
			uploaded_by: input.uploadedBy,
			is_current: false,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	return {
		row: inserted as unknown as ResourcePackRow,
		warnings: packWarnings(packFormat, minecraft),
	};
}

/**
 * A pack made for one client version still loads on another with a warning,
 * but that is worth surfacing before the upload is published.
 */
export function packWarnings(packFormat: number | null, minecraft: string[]): string[] {
	if (packFormat === null) return ["pack.mcmeta has no pack_format; the client may fall back to a warning screen"];

	const mismatched = minecraft.filter((version) => PACK_FORMATS[version] !== undefined && PACK_FORMATS[version] !== packFormat);

	if (mismatched.length === 0) return [];

	const expected = minecraft.map((version) => `${version}=${PACK_FORMATS[version] ?? "?"}`).join(", ");

	return [
		`pack_format ${packFormat} does not match ${mismatched.join(", ")} (expected ${expected}); clients will show an incompatible pack warning`,
	];
}

/**
 * Makes a stored version current: copies the archive to the canonical path,
 * rewrites the manifest entry and flips the pointer. Order matters - the file
 * must exist before the manifest reports its hash.
 */
export async function publishResourcePack(id: number): Promise<ResourcePackPayload | null> {
	const row = await getResourcePack(id);
	if (!row) return null;

	const source = S3.getClient(BUCKETS.STATIC).file(row.object_key);
	if (!(await source.exists())) throw new Error("pack object is missing from the volume");

	const client = S3.getClient(BUCKETS.STATIC);
	await client.write(PACK_CANONICAL_KEY, source, { type: "application/zip" });
	await client.write(PACK_PUBLIC_KEY, source, { type: "application/zip" });

	const manifest = await readContentManifest();
	const next = upsertManifestEntry(manifest, {
		path: PACK_MANIFEST_ENTRY,
		hash: row.sha256,
		bundle: "base",
		minecraft: row.minecraft.length > 0 ? row.minecraft : DEFAULT_PACK_VERSIONS,
	});

	await client.write(MANIFEST_KEY, JSON.stringify(next, null, 2), {
		type: "application/json",
	});
	invalidateContentManifest();

	await general.transaction().execute(async (trx) => {
		await trx.updateTable("resource_packs").set({ is_current: false }).where("is_current", "=", true).execute();
		await trx.updateTable("resource_packs").set({ is_current: true }).where("id", "=", id).execute();
	});

	natsService.getOptionalInstance()?.publish(
		SUBJECTS.RESOURCEPACK.UPDATED,
		JSON.stringify({
			id: row.id,
			sha1: row.sha1,
			sha256: row.sha256,
			url: objectUrl(row.object_key),
			minecraft: row.minecraft,
		}),
	);

	const fresh = await getResourcePack(id);

	return fresh ? toPayload(fresh) : null;
}

/** Payload for the game backend: versioned URL plus the SHA-1 clients verify. */
export type ResourcePackMeta = {
	version: number;
	sha1: string;
	sha256: string;
	size: number;
	url: string;
	stable_url: string;
	minecraft: string[];
	pack_format: number | null;
	updated_at: string;
};

export async function getPackMeta(): Promise<ResourcePackMeta | null> {
	const row = (await general
		.selectFrom("resource_packs")
		.selectAll()
		.where("is_current", "=", true)
		.executeTakeFirst()) as unknown as ResourcePackRow | undefined;

	if (!row) return null;

	const payload = toPayload(row);

	return {
		version: payload.id,
		sha1: payload.sha1,
		sha256: payload.sha256,
		size: payload.size,
		url: payload.url,
		stable_url: payload.stable_url,
		minecraft: payload.minecraft,
		pack_format: payload.pack_format,
		updated_at: payload.created_at,
	};
}
