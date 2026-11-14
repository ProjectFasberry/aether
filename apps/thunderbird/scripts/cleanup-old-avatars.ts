/**
 * Removes the pre-content-addressed player heads from the avatars bucket.
 *
 *   infisical run --env=prod --path=/thunderbird -- bun run scripts/cleanup-old-avatars.ts
 *   ... --apply
 *
 * Dry run by default. New heads are `heads-<sha256>.png`; everything else is
 * the old `<nickname>-<identifier>.png` naming that the API no longer reads.
 */
const apply = Bun.argv.includes("--apply");

const envModule = await import("../src/shared/env");
envModule.initEnv();

const { minioService } = await import("../src/shared/services/minio");
const { BUCKETS } = await import("../src/shared/minio/client");

await minioService.start({ showBuckets: false });

const bucket = BUCKETS.AVATARS;
const client = minioService.getInstance();

const old: string[] = [];
const stream = client.listObjectsV2(bucket, "", true);

for await (const object of stream) {
	if (!object.name.startsWith("heads-")) old.push(object.name);
}

console.log(`old objects: ${old.length}`);
console.log(old.slice(0, 10).join("\n"));

if (!apply) {
	console.log("dry run: pass --apply to delete");
	process.exit(0);
}

for (const name of old) {
	await client.removeObject(bucket, name);
}

console.log(`deleted: ${old.length}`);
process.exit(0);
