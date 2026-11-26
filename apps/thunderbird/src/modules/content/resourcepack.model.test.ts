import { describe, expect, it, mock } from "bun:test";

mock.module("#/shared/env", () => ({
	getEnv: () => ({ VOLUME_URL: "https://volume.test" }),
}));
mock.module("#/shared/minio/client", () => ({
	BUCKETS: { STATIC: "static" },
	S3: { getClient: () => ({}) },
}));
mock.module("#/shared/database/general-db", () => ({ general: {} }));
mock.module("#/shared/nats/client", () => ({ natsService: { getOptionalInstance: () => null } }));
mock.module("#/helpers/volume", () => ({
	getStaticUrl: (path: string) => `https://volume.test/static/${path}`,
}));
mock.module("@repo/shared/constants/subjects", () => ({
	SUBJECTS: { RESOURCEPACK: { UPDATED: "general.resourcepack.updated" } },
}));

const { packWarnings, readPackMeta } = await import("./resourcepack.model");
const { upsertManifestEntry } = await import("./manifest.model");

/** Builds a stored (uncompressed) ZIP with the given files. CRC is left at 0. */
function makeZip(files: Record<string, string>): Uint8Array {
	const encoder = new TextEncoder();
	const chunks: Uint8Array[] = [];
	const central: Uint8Array[] = [];
	let offset = 0;

	for (const [name, content] of Object.entries(files)) {
		const nameBytes = encoder.encode(name);
		const body = encoder.encode(content);

		const local = new Uint8Array(30 + nameBytes.length + body.length);
		const localView = new DataView(local.buffer);
		localView.setUint32(0, 0x04034b50, true);
		localView.setUint16(4, 20, true);
		localView.setUint32(18, body.length, true);
		localView.setUint32(22, body.length, true);
		localView.setUint16(26, nameBytes.length, true);
		local.set(nameBytes, 30);
		local.set(body, 30 + nameBytes.length);

		const entry = new Uint8Array(46 + nameBytes.length);
		const entryView = new DataView(entry.buffer);
		entryView.setUint32(0, 0x02014b50, true);
		entryView.setUint16(4, 20, true);
		entryView.setUint16(6, 20, true);
		entryView.setUint32(20, body.length, true);
		entryView.setUint32(24, body.length, true);
		entryView.setUint16(28, nameBytes.length, true);
		entryView.setUint32(42, offset, true);
		entry.set(nameBytes, 46);

		chunks.push(local);
		central.push(entry);
		offset += local.length;
	}

	const centralOffset = offset;
	let centralSize = 0;
	for (const entry of central) {
		centralSize += entry.length;
		offset += entry.length;
	}

	const end = new Uint8Array(22);
	const endView = new DataView(end.buffer);
	endView.setUint32(0, 0x06054b50, true);
	endView.setUint16(8, central.length, true);
	endView.setUint16(10, central.length, true);
	endView.setUint32(12, centralSize, true);
	endView.setUint32(16, centralOffset, true);

	return new Uint8Array([...chunks.flatMap((chunk) => [...chunk]), ...central.flatMap((chunk) => [...chunk]), ...end]);
}

describe("readPackMeta", () => {
	it("reads pack_format from a stored zip", () => {
		const zip = makeZip({
			"pack.mcmeta": JSON.stringify({ pack: { pack_format: 15, description: "test" } }),
			"assets/test.txt": "hello",
		});

		expect(readPackMeta(zip)).toEqual({ packFormat: 15, entries: 2 });
	});

	it("returns null pack_format when the field is missing", () => {
		const zip = makeZip({ "pack.mcmeta": JSON.stringify({ pack: { description: "test" } }) });

		expect(readPackMeta(zip).packFormat).toBeNull();
	});

	it("rejects a file that is not a zip", () => {
		expect(() => readPackMeta(new TextEncoder().encode("just a pack"))).toThrow("not a zip");
	});

	it("rejects an archive without pack.mcmeta", () => {
		const zip = makeZip({ "assets/test.txt": "hello" });

		expect(() => readPackMeta(zip)).toThrow("pack.mcmeta is missing");
	});
});

describe("packWarnings", () => {
	it("is silent when pack_format matches every target", () => {
		expect(packWarnings(15, ["1.20.1"])).toEqual([]);
	});

	it("mentions the client whose pack_format differs", () => {
		const warnings = packWarnings(15, ["1.20.1", "1.20.4"]);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain("1.20.4");
	});

	it("warns when pack.mcmeta has no pack_format", () => {
		expect(packWarnings(null, ["1.20.1"])[0]).toContain("pack_format");
	});
});

describe("upsertManifestEntry", () => {
	it("replaces the pack and rebuilds legacy and versioned bundles", () => {
		const manifest = {
			files: [
				{ path: "content/mods/1.20.1/sodium.jar", hash: "abc", bundle: "base", minecraft: ["1.20.1"] },
				{ path: "resourcepacks/generated.zip", hash: "old" },
			],
			bundles: {
				base: { version: "old", files: ["content/mods/1.20.1/sodium.jar", "resourcepacks/generated.zip"] },
			},
		};

		const next = upsertManifestEntry(manifest, {
			path: "resourcepacks/generated.zip",
			hash: "new",
			bundle: "base",
			minecraft: ["1.20.1", "1.20.4"],
		});

		const pack = next.files.filter((file) => file.path === "resourcepacks/generated.zip");

		expect(pack).toHaveLength(1);
		expect(pack[0]?.hash).toBe("new");
		expect(pack[0]?.minecraft).toEqual(["1.20.1", "1.20.4"]);

		expect(next.bundles?.["base:1.20.1"]?.files).toContain("resourcepacks/generated.zip");
		expect(next.bundles?.["base:1.20.4"]?.files).toContain("resourcepacks/generated.zip");
		expect(next.bundles?.base?.files).toEqual(next.bundles?.["base:1.20.4"]?.files ?? []);
	});

	it("normalises legacy entries without minecraft to 1.20.4", () => {
		const next = upsertManifestEntry(
			{ files: [{ path: "content/mods/old.jar", hash: "abc" }] },
			{ path: "resourcepacks/generated.zip", hash: "new", bundle: "base", minecraft: ["1.20.4"] },
		);

		expect(next.files.find((file) => file.path === "content/mods/old.jar")?.minecraft).toEqual(["1.20.4"]);
		expect(next.bundles?.["base:1.20.4"]?.files).toContain("content/mods/old.jar");
	});
});
