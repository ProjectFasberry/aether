import { validatePermission } from "#/lib/validators";
import { permissions } from "#/shared/constants/permissions";
import { S3 } from "#/shared/minio/client";
import { withData } from "#/shared/schemas";
import { minioService } from "#/shared/services/minio";
import { buildRouteSummary } from "#/utils";
import Elysia, { t } from "elysia";

const S3ObjectSchema = t.Object({
  checksumAlgorithm: t.Optional(
    t.Union([t.Literal("CRC32"), t.Literal("CRC32C"), t.Literal("SHA1"), t.Literal("SHA256"), t.Literal("CRC64NVME")])
  ),
  checksumType: t.Optional(
    t.Union([t.Literal("COMPOSITE"), t.Literal("FULL_OBJECT")]),
  ),
  eTag: t.Optional(t.String(),),
  key: t.String(),
  lastModified: t.Optional(t.String()),
  owner: t.Optional(
    t.Object({
      id: t.Optional(t.String()),
      displayName: t.Optional(t.String())
    }),
  ),
  restoreStatus: t.Optional(
    t.Object({
      isRestoreInProgress: t.Optional(t.Boolean()),
      restoreExpiryDate: t.Optional(t.String())
    }),
  ),
  size: t.Optional(t.Number()),
  storageClass: t.Optional(
    t.Union([
      t.Literal("STANDARD"),
      t.Literal("REDUCED_REDUNDANCY"),
      t.Literal("GLACIER"),
      t.Literal("STANDARD_IA"),
      t.Literal("ONEZONE_IA"),
      t.Literal("INTELLIGENT_TIERING"),
      t.Literal("DEEP_ARCHIVE"),
      t.Literal("OUTPOSTS"),
      t.Literal("GLACIER_IR"),
      t.Literal("SNOW"),
      t.Literal("EXPRESS_ONEZONE")
    ]),
  )
});

const S3ListObjectsResponseSchema = t.Object({
  contents: t.Optional(t.Array(S3ObjectSchema)),
  continuationToken: t.Optional(t.String()),
  delimiter: t.Optional(t.String()),
  encodingType: t.Optional(t.Union([t.Literal("url")])),
  isTruncated: t.Optional(t.Boolean()),
  keyCount: t.Optional(t.Number()),
  maxKeys: t.Optional(t.Number()),
  name: t.Optional(t.String()),
  nextContinuationToken: t.Optional(t.String()),
  prefix: t.Optional(t.String()),
  startAfter: t.Optional(t.String())
});

export const volume = new Elysia()
  .use(validatePermission(permissions.get("VOLUME.CONTROL")))
  .group("/volume", app => app
    .get("/buckets/list", async () => {
      const buckets = await minioService.getInstance().listBuckets()

      const data = buckets.map(bucket => ({
        name: bucket.name,
        creationDate: bucket.creationDate.toString()
      }))

      return { data }
    }, {
      response: {
        200: withData(
          t.Array(
            t.Object({
              name: t.String(),
              creationDate: t.String(),
            })
          )
        )
      },
      detail: {
        summary: buildRouteSummary("List buckets")
      }
    })
    .group("/buckets/:bucket", app => app
      .get('/', async ({ params: { bucket } }) => {
        const instance = minioService.getInstance();

        const [policy, lifecycle, tagging, versioning, notification] = await Promise.all([
          instance.getBucketPolicy(bucket).catch(() => null),
          instance.getBucketLifecycle(bucket).catch(() => null),
          instance.getBucketTagging(bucket).catch(() => null),
          instance.getBucketVersioning(bucket).catch(() => null),
          instance.getBucketNotification(bucket).catch(() => null)
        ])

        const data = {
          policy: policy ? JSON.parse(policy) : null,
          lifecycle,
          tagging,
          versioning,
          notification,
        }

        return { data };
      }, {
        response: {
          200: withData(
            t.Object({
              policy: t.Optional(t.Object({})),
              lifecycle: t.Optional(t.Object({})),
              tagging: t.Optional(t.Object({})),
              versioning: t.Optional(t.Object({})),
              notification: t.Optional(t.Object({})),
            })
          )
        },
        detail: {
          summary: buildRouteSummary("Get bucket details")
        }
      })
      .get("/list", async ({ params: { bucket }, query: { folder } }) => {
        const data = await S3.getClient(bucket).list({
          prefix: folder
        })

        if (!data.contents || data.contents.length === 0) {
          return { data: null }
        }

        return { data };
      }, {
        query: t.Object({
          folder: t.Optional(t.String({ minLength: 1 }))
        }),
        response: {
          200: withData(
            t.Nullable(S3ListObjectsResponseSchema)
          )
        },
        detail: {
          summary: buildRouteSummary("List bucket objects")
        }
      })
    )
  )
