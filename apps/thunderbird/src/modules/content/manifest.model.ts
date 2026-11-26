import { createHash } from "node:crypto";
import { BUCKETS, S3 } from "#/shared/minio/client";

/** Object key of the content manifest inside the `static` bucket. */
export const MANIFEST_KEY = "resourcepack/manifest.json";
/** Everything listed in the manifest lives under this prefix. */
export const CONTENT_PREFIX = "resourcepack/";

export type ManifestEntry = {
	path: string;
	hash: string;
	/** Content bundle: omitted and `base` ship always, `server:<id>` per backend. */
	bundle?: string;
	/** Client versions the file may be installed for. Absent means the legacy 1.20.4-only manifest. */
	minecraft?: string[];
};

export type ManifestBundle = {
	version: string;
	files: string[];
};

export type ContentManifest = {
	files: ManifestEntry[];
	bundles?: Record<string, ManifestBundle>;
};

/** Entries without `minecraft` predate multi-version content and belong to 1.20.4 only. */
export function entryVersions(entry: ManifestEntry): string[] {
	return entry.minecraft?.length ? entry.minecraft : ["1.20.4"];
}

/** Canonical manifest path of the server resource pack. */
export const PACK_MANIFEST_PATH = "resourcepacks/generated.zip";

const CACHE_TTL_MS = 60_000;
let cached: { at: number; value: ContentManifest } | null = null;

/** Reads the published manifest once a minute: it changes only when content is published. */
export async function readContentManifest(): Promise<ContentManifest> {
	if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

	const manifest = (await S3.getClient(BUCKETS.STATIC).file(MANIFEST_KEY).json()) as ContentManifest;
	cached = { at: Date.now(), value: manifest };

	return manifest;
}

/** Drops the in-process copy after a write, so the next read sees the new manifest. */
export function invalidateContentManifest(): void {
	cached = null;
}

function compareVersions(a: string, b: string): number {
	const left = a.split(".").map(Number);
	const right = b.split(".").map(Number);

	for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
		const diff = (left[i] ?? 0) - (right[i] ?? 0);
		if (diff !== 0) return diff;
	}

	return a.localeCompare(b);
}

/**
 * Adds or replaces one manifest entry and rebuilds every bundle from the file
 * list. Mirrors `mods/scripts/publish-content.ts`: bundles are keyed
 * `<bundle>:<version>`, the legacy `<bundle>` keys stay on 1.20.4, and entries
 * without `minecraft` belong to 1.20.4 only.
 */
export function upsertManifestEntry(manifest: ContentManifest, entry: ManifestEntry): ContentManifest {
	const files = (manifest.files ?? []).map((file) =>
		file.minecraft?.length ? file : { ...file, minecraft: ["1.20.4"] },
	);

	const next = files.filter((file) => file.path !== entry.path);
	next.push(entry);

	const versions = new Set<string>(["1.20.4"]);
	for (const file of next) for (const version of entryVersions(file)) versions.add(version);
	for (const name of Object.keys(manifest.bundles ?? {})) {
		const match = /^base:(.+)$/.exec(name);
		if (match) versions.add(match[1]);
	}

	const bundles: Record<string, ManifestBundle> = {};

	const addBundle = (name: string, filter: (file: ManifestEntry) => boolean) => {
		const members = next.filter(filter);
		if (members.length === 0) return;

		members.sort((a, b) => a.path.localeCompare(b.path));
		const content = members.map((member) => `${member.path}:${member.hash}`).join("\n");

		bundles[name] = {
			version: createHash("sha256").update(content).digest("hex").slice(0, 12),
			files: members.map((member) => member.path),
		};
	};

	for (const version of [...versions].sort(compareVersions)) {
		addBundle(`base:${version}`, (file) =>
			(!file.bundle || file.bundle === "base") && entryVersions(file).includes(version),
		);

		for (const name of new Set(next.map((file) => file.bundle))) {
			if (!name?.startsWith("server:")) continue;

			addBundle(`${name}:${version}`, (file) => file.bundle === name && entryVersions(file).includes(version));
		}

		if (version === "1.20.4") {
			addBundle("base", (file) =>
				(!file.bundle || file.bundle === "base") && entryVersions(file).includes(version),
			);

			for (const name of new Set(next.map((file) => file.bundle))) {
				if (!name?.startsWith("server:")) continue;

				addBundle(name, (file) => file.bundle === name && entryVersions(file).includes(version));
			}
		}
	}

	return { files: next, bundles };
}

/**
 * A server may only point at a client version and a pack that were actually
 * published: otherwise the launcher installs a runtime whose bundle does not
 * exist and blocks the launch.
 *
 * Returns a human-readable reason, or null when the values are usable.
 */
export async function validateServerContent(
	clientVersion: string,
	resourcePack: string | null,
): Promise<string | null> {
	const manifest = await readContentManifest();
	const version = clientVersion.trim();
	const bundles = manifest.bundles ?? {};

	const hasBase = Boolean(bundles[`base:${version}`]) || (version === "1.20.4" && Boolean(bundles.base));
	if (!hasBase) return `No client content is published for ${version} (missing bundle "base:${version}")`;

	if (resourcePack) {
		const path = `resourcepacks/${resourcePack}`;
		const entry = manifest.files.find((file) => file.path === path);
		if (!entry) return `Resource pack "${resourcePack}" is not published (${path})`;
		if (!entryVersions(entry).includes(version)) return `Resource pack "${resourcePack}" is not published for ${version}`;
	}

	return null;
}

/**
 * Client versions the launcher can actually install: a version exists when its
 * `base:<version>` bundle was published. Legacy `base` counts as 1.20.4, the
 * only version the pre-runtime launcher understood.
 */
export async function publishedClientVersions(): Promise<string[]> {
	const manifest = await readContentManifest();
	const versions = new Set<string>();

	for (const name of Object.keys(manifest.bundles ?? {})) {
		const match = /^base:(.+)$/.exec(name);
		if (match) versions.add(match[1]);
	}

	if (!versions.has("1.20.4") && manifest.bundles?.base) versions.add("1.20.4");

	return [...versions].sort((a, b) => {
		const left = a.split(".").map(Number);
		const right = b.split(".").map(Number);
		for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
			const diff = (left[i] ?? 0) - (right[i] ?? 0);
			if (diff !== 0) return diff;
		}
		return a.localeCompare(b);
	});
}
