import { VOLUME_URL } from "#/shared/env"
import { BUCKETS } from "#/shared/minio/client"

export const getSkinName = (key: string) => `skin-${key}.png`
export const getAvatarName = (nickname: string, identifier: string) => `${nickname}-${identifier}.png`

export const getObjectUrl = (bucket: string, key: string) => `${VOLUME_URL}/${bucket}/${key}`
export const getStaticUrl = (name: string) => `${VOLUME_URL}/${BUCKETS.STATIC}/${name}`