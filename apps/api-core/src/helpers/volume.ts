import { env } from "#/shared/env"
import { BUCKETS } from "#/shared/minio/client"

export const getSkinName = (key: string) => `skin-${key}.png`
export const getAvatarName = (nickname: string, identifier: string) => `${nickname}-${identifier}.png`

export const getObjectUrl = (bucket: string, key: string) => `${env.VOLUME_URL}/${bucket}/${key}`
export const getStaticUrl = (path: string) => `${env.VOLUME_URL}/${BUCKETS.STATIC}/${path}`
export const getUrl = (path: string) => `${env.VOLUME_URL}/${path}`
