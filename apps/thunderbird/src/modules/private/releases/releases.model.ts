import { BUCKETS, S3 } from "#/shared/minio/client";
import { t, type Static } from "elysia";

/**
 * Launcher releases in the private panel.
 *
 * The bucket layout is owned by `janus/tools/release.ts`:
 *
 *   fasberry/<channel>/latest.json                  current release
 *   fasberry/<channel>/<version>/latest.json        per-version snapshot
 *   fasberry/<channel>/<version>/<platform>/<file>  platform artifacts
 *
 * The list is generated from the bucket (not from `latest.json`) so the panel
 * also shows versions that are no longer `latest`: promoted, rolled back or
 * superseded builds stay downloadable until retention removes them.
 */
const PREFIX = "fasberry/";
const CACHE_TTL_MS = 30_000;

export const RELEASE_CHANNELS = ["prod", "dev"] as const;
export type ReleaseChannel = typeof RELEASE_CHANNELS[number];

export const releaseChannels = new Set<string>(RELEASE_CHANNELS);

export const releaseFileSchema = t.Object({
  name: t.String(),
  size: t.Number(),
  checksum: t.Nullable(t.String()),
});

export const releasePlatformSchema = t.Object({
  platform: t.String(),
  files: t.Array(releaseFileSchema),
});

export const releaseSchema = t.Object({
  channel: t.String(),
  version: t.String(),
  pub_date: t.Nullable(t.String()),
  notes: t.String(),
  latest: t.Boolean(),
  platforms: t.Array(releasePlatformSchema),
});

export const releasesSchema = t.Array(releaseSchema);
export type Release = Static<typeof releaseSchema>;

type Snapshot = {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, { signature?: string; url: string }>;
};

type ListedObject = {
  key: string;
  size: number;
  lastModified: Date | string | null;
};

const cache = new Map<string, { at: number; data: Release[] }>();

async function listAll(prefix: string): Promise<ListedObject[]> {
  const client = S3.getClient(BUCKETS.RELEASES);
  const result: ListedObject[] = [];
  let token: string | undefined;

  do {
    const page = await client.list({ prefix, continuationToken: token });

    for (const item of page.contents ?? []) {
      if (!item.key) continue;

      result.push({
        key: item.key,
        size: Number(item.size ?? 0),
        lastModified: item.lastModified ?? null,
      });
    }

    token = page.isTruncated ? page.nextContinuationToken : undefined;
  } while (token);

  return result;
}

async function readSnapshot(key: string): Promise<Snapshot | null> {
  return (await S3.getClient(BUCKETS.RELEASES)
    .file(key)
    .json()
    .catch(() => null)) as Snapshot | null;
}

function lastModified(objects: ListedObject[]): string | null {
  let latest = 0;

  for (const object of objects) {
    if (!object.lastModified) continue;

    const value = new Date(object.lastModified).getTime();
    if (value > latest) latest = value;
  }

  return latest > 0 ? new Date(latest).toISOString() : null;
}

function groupPlatforms(channel: ReleaseChannel, version: string, objects: ListedObject[]) {
  const platformFiles = new Map<string, { name: string; size: number }[]>();

  for (const object of objects) {
    const rest = object.key.slice(`${PREFIX}${channel}/${version}/`.length).split("/");

    // <platform>/<file>; the version snapshot (latest.json) has one segment.
    if (rest.length !== 2) continue;

    const [platform, name] = rest;
    // The per-platform updater manifest is metadata, not a downloadable build.
    if (!platform || !name || name === "latest.json") continue;

    const files = platformFiles.get(platform) ?? [];
    files.push({ name, size: object.size });
    platformFiles.set(platform, files);
  }

  return [...platformFiles.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([platform, files]) => ({
      platform,
      files: files
        .filter((file) => !file.name.endsWith(".sha256"))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((file) => ({
          ...file,
          checksum: files.some((candidate) => candidate.name === `${file.name}.sha256`)
            ? `${file.name}.sha256`
            : null,
        })),
    }));
}

export async function listReleases(channel: ReleaseChannel): Promise<Release[]> {
  const cached = cache.get(channel);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const objects = await listAll(`${PREFIX}${channel}/`);
  const current = await readSnapshot(`${PREFIX}${channel}/latest.json`);

  const versions = new Map<string, ListedObject[]>();

  for (const object of objects) {
    const rest = object.key.slice(`${PREFIX}${channel}/`.length).split("/");
    const version = rest[0];

    if (!version || version === "latest.json") continue;

    const list = versions.get(version) ?? [];
    list.push(object);
    versions.set(version, list);
  }

  const releases = await Promise.all([...versions.entries()].map(async ([version, files]) => {
    const snapshot = await readSnapshot(`${PREFIX}${channel}/${version}/latest.json`);

    return {
      channel,
      version,
      pub_date: snapshot?.pub_date ?? lastModified(files),
      notes: snapshot?.notes ?? "",
      latest: current?.version === version,
      platforms: groupPlatforms(channel, version, files),
    } satisfies Release;
  }));

  releases.sort((a, b) => {
    const byDate = Date.parse(b.pub_date ?? "") - Date.parse(a.pub_date ?? "");
    if (Number.isFinite(byDate) && byDate !== 0) return byDate;

    return b.version.localeCompare(a.version, undefined, { numeric: true });
  });

  cache.set(channel, { at: Date.now(), data: releases });
  return releases;
}

/** Bucket key of one artifact; every segment is validated by the route. */
export function releaseKey(channel: string, version: string, platform: string, file: string) {
  return `${PREFIX}${channel}/${version}/${platform}/${file}`;
}
